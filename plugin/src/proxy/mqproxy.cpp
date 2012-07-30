#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <netdb.h>
#include <pthread.h>

#include <openssl/sha.h>
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>

#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <arpa/inet.h>

#include "SDL.h"
#include "PDL.h"
#include <syslog.h>

#include "mqproxy.h"
#define MAX_BUFFER_LEN 65536

#define ntohll(x) ( ( (uint64_t)(ntohl( (uint32_t)((x << 32) >> 32) )) << 32) | ntohl( ((uint32_t)(x >> 32)) ) )                                        
#define htonll(x) ntohll(x)

//socket
int sock = -1;
//reconnect time
struct timeval timeReconn;

char* m_sock_addr;
unsigned short m_sock_port;
char* m_auth;
bool isInited = false;

char buffered[65536]={0};
int bufferedSize = 0;
static pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void didConnected(const char* auth);
void SIGIOHandler(int, siginfo_t *info, void *uap); /* Function to handle SIGIO */
void sendMsgs(MM_SMCP_CMD_TYPE cmdTypeRaw, int packNumberIn, char* orig, const char* receiver);
char *base64_encode(const unsigned char *input, int length);
char *base64_decode(char *input, int length);

void closeSocketOnly() {
	close(sock);
	sock = -1;
}

void closeSocket(){
	syslog(LOG_ALERT, "closeSocket");
	sendMsgs(SMCP_SYS_LOGOUT, 0, NULL, NULL);
	closeSocketOnly();
	free(m_sock_addr);
	free(m_auth);
}

void reconnect() {
	struct timeval now;
	gettimeofday(&now, NULL);
	if((now.tv_sec - timeReconn.tv_sec) > 60 || sock < 0) {
		timeReconn = now;

		//reconnect
		if(isInited) {
			if(sock > 0) {
				closeSocketOnly();
			}
			//reset buffed size
			bufferedSize = 0;
			openSocket((const char*)m_sock_addr, m_sock_port, (const char*)m_auth);
		}
	}
}

char *get_ip(char *host)
{
	struct addrinfo hints, *res;
	struct in_addr addr;
	int err;

	memset(&hints, 0, sizeof(hints));
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_family = AF_INET;

	if ((err = getaddrinfo(host, NULL, &hints, &res)) != 0) {
		syslog(LOG_ERR, "Can't get IP, %d", err);
		return host;
		//return "121.207.242.119";
	}
	addr.s_addr = ((struct sockaddr_in *)(res->ai_addr))->sin_addr.s_addr;
	return inet_ntoa(addr);
}

int openSocket(const char* addr, unsigned short port, const char* auth) {
	int hostLen = strlen(addr) + 1;
	if(hostLen < 16) {
		hostLen = 16;
	}
	char* rAddr = (char*)malloc(hostLen);
	memset(rAddr, 0, hostLen);
	memcpy(rAddr, addr, strlen(addr));
	char* ip = get_ip(rAddr);
	if(ip == rAddr) {
		syslog(LOG_INFO, "ip not got, set it default %s", ip);
		char def[16] = "121.207.242.119";
		ip = def;
	}
	free(rAddr);
	syslog(LOG_INFO, "ip got====---=== %s", ip);
	if(!isInited) {
		isInited = true;

		m_sock_addr = (char*)malloc(strlen(addr) + 1);
		memcpy(m_sock_addr, addr, strlen(addr));
		memset(m_sock_addr + strlen(addr), 0, 1);
		//m_sock_addr = addr;

		m_sock_port = port;

		m_auth = (char*)malloc(strlen(auth) + 1);
		memcpy(m_auth, auth, strlen(auth) + 1);
		memset(m_auth + strlen(auth), 0, 1);
		//m_auth = auth;
	}

	syslog(LOG_INFO, "OPEN SOCKET: %s", ip);

	struct sockaddr_in sockaddr;
	struct sigaction handler;

	/* Create socket for sending/receiving datagrams */
	if((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
		syslog(LOG_ALERT, "socket() fail");
		return -1;
	}

	/* Set up the server address structure */
	memset(&sockaddr, 0, sizeof(sockaddr));
	sockaddr.sin_family = AF_INET;
	sockaddr.sin_addr.s_addr = inet_addr(ip);
	sockaddr.sin_port = htons(port);

	/* Bind to the local address */
	if(connect(sock, (struct sockaddr *) &sockaddr, sizeof(sockaddr)) < 0) {
		syslog(LOG_ALERT, "connect() fail");
		return -1;
	}

	/* Set signal handler for SIGIO */
	handler.sa_sigaction = SIGIOHandler;
	/* Create mask that mask all signals */
	if (sigfillset(&handler.sa_mask) < 0){
		syslog(LOG_ALERT, "sigfillset() failed");
		return -1;
	}
	/* No flags */
	handler.sa_flags = 0;

	if (sigaction(SIGIO|SIGHUP, &handler, 0) < 0){
		syslog(LOG_ALERT, "sigaction() failed for SIGIO");
		return -1;
	}

	/* We must own the socket to receive the SIGIO message */
	if (fcntl(sock, F_SETOWN, getpid()) < 0){
		syslog(LOG_ALERT, "Unable to set process owner to us");
		return -1;
	}

	/* Arrange for nonblocking I/O and SIGIO delivery */
	if (fcntl(sock, F_SETFL, O_NONBLOCK | FASYNC) < 0){
		syslog(LOG_ALERT, "Unable to put client sock into non-blocking/async mode");
		return -1;
	}	

	didConnected(auth);
}

void setHeartBeatTimer() {
	struct timeval my_value={30,0};
	struct timeval my_interval={30,0};
	struct itimerval my_timer={my_interval, my_value};
	setitimer(ITIMER_REAL, &my_timer, 0);
}

void onKeepAlive(int sig) {
	//TODO cancel timer on disconnected
	syslog(LOG_NOTICE, "on keep alive ====---====---: %d", getpid());

	sendMsgs(SMCP_SYS_HEARTBEAT, 0, NULL, NULL);
}

void didConnected(const char* auth) {
	/* 发送认证信息 */
	int size = strlen(auth);
	const char* head = "smcp0001";
	char buf[2048];

	char* index = buf;
	strcpy(index, head);
	index += strlen(head);

	uint32_t netInt = htonl(size);
	memcpy(index, &netInt, sizeof(netInt));
	index+= sizeof(netInt);

	memcpy(index, auth, size);

	int r = send(sock, buf, size + sizeof(size) + 8, 0);
	syslog(LOG_ALERT, "head info send result: %d", r);

	//signal to keep alive
	signal(SIGALRM, onKeepAlive);

	setHeartBeatTimer();
}

void didReceiveData(const char *theData){
	syslog(LOG_ALERT, "data received: %s", theData);
	const char *params[1];
	params[0] = theData;
	PDL_Err mjErr = PDL_CallJS("didReceiveData", params, 1);
	if ( mjErr != PDL_NOERROR )
	{
		printf("error: %s\n", PDL_GetError());
	}
}

int onIOBuffer(int recvMsgSize, char* echoBuffer, char* buffer) {
	syslog(LOG_ALERT, "welll recving msg onIOBuffer: %d --------------->", recvMsgSize);
	if(recvMsgSize < 8) {
		return recvMsgSize;// return echoBuffer;
	}
	//head
	buffer = (char*)echoBuffer;
	int byteCount = 0;

	//cmd
	MM_SMCP_CMD_TYPE cmdType = (MM_SMCP_CMD_TYPE)(ntohs(*(uint16_t*)buffer));
	buffer += sizeof(uint16_t);
	byteCount += sizeof(uint16_t);
	syslog(LOG_ALERT, "welll recving msg type: %d --------------->", cmdType);

	//flags
	uint16_t packHead = ntohs(*(uint16_t*)buffer);
	buffer += sizeof(uint16_t);
	byteCount += sizeof(uint16_t);
	syslog(LOG_ALERT, "welll recving msg flags: %d --------------->", packHead);

	uint64_t uid = 0;
	if (packHead & 0x20) {
		if (recvMsgSize < byteCount + sizeof(uint64_t) + sizeof(uint32_t)) return recvMsgSize;//return echoBuffer;

		uid = ntohll(*(uint64_t*)buffer);
		buffer += sizeof(uint64_t);
		byteCount += sizeof(uint64_t);
		syslog(LOG_ALERT, "welll recving msg uid: %d --------------->", uid);
	}

	uint64_t timeStamp = 0;
	if (packHead & 0x10) {
		if (recvMsgSize < byteCount + sizeof(uint64_t) + sizeof(uint32_t)) return recvMsgSize;//return echoBuffer;

		timeStamp = ntohll(*(uint64_t*)buffer);
		buffer += sizeof(uint64_t);
		byteCount += sizeof(uint64_t);
		syslog(LOG_ALERT, "welll recving msg timestamp: %d --------------->", timeStamp);
	}

	//下行包序号
	int downPackNumber = 0;
	if (packHead & 0x8) {
		if (recvMsgSize < byteCount + sizeof(uint32_t) + sizeof(uint32_t)) return recvMsgSize;//return echoBuffer;

		downPackNumber = ntohl(*(uint32_t*)buffer);
		buffer += sizeof(uint32_t);
		byteCount += sizeof(uint32_t);
		syslog(LOG_ALERT, "welll recving msg pack num: %d --------------->", downPackNumber);
	}

	//上行包序号
	int upPackNumber = 0;
	if (packHead & 0x4) {
		if (recvMsgSize < byteCount + sizeof(uint32_t) + sizeof(uint32_t)) return recvMsgSize;//return echoBuffer;

		upPackNumber = ntohl(*(uint32_t*)buffer);
		buffer += sizeof(uint32_t);
		byteCount += sizeof(uint32_t);
		syslog(LOG_ALERT, "welll recving msg up pack num: %d --------------->", upPackNumber);
	}

	//是否加密
	bool isEncrypted = false;
	if (packHead & 0x2) {
		isEncrypted = true;
	}

	//是否压缩
	bool isCompress = false;
	if (packHead & 0x1) {
		isCompress = true;
		syslog(LOG_ALERT, "welll isCompressed @@@@@@@@@@@@");
	}

	//length
	if (recvMsgSize < byteCount + 4) return recvMsgSize;//return echoBuffer;
	int contentLength = ntohl(*(uint32_t*)buffer);
	buffer += sizeof(uint32_t);
	byteCount += sizeof(uint32_t);
	syslog(LOG_ALERT, "welll recving msg content length: %d --------------->", contentLength);

	//check content
	if(recvMsgSize >= byteCount + contentLength) {
		syslog(LOG_ALERT, "recving msg type: %d, timestamp: %d", cmdType, timeStamp);

		if(cmdType == SMCP_IM_DELIVER) {
			//syslog(LOG_ALERT, "recving msg type: %d, strlen: %d", cmdType, strlen((char*)buffer));
			//syslog(LOG_ALERT, "recving msg type: %d, strlen: %s", cmdType, (char*)buffer);
			//syslog(LOG_ALERT, "====>recving msg type 16129: contentlength: %d", contentLength);
			//syslog(LOG_ALERT, "====>recving msg type 16129 content: %s", buffer);
			char* body = (char*)malloc(contentLength + 1);
			memcpy(body, buffer, contentLength);
			char* last = body + contentLength;
			memset(last, 0, 1);
			syslog(LOG_ALERT, "welll length: %d, recving msg conetnt!!!: %s", contentLength, body);

			//convert to base64
			char* base64Body = base64_encode((const unsigned char*)body, contentLength);

			//return;
			//call js
			const char* results[2];
			results[0] = base64Body;
			char time[16] = {0};
			sprintf(time, "%d", timeStamp);
			results[1] = time;
			PDL_CallJS("onProxyMsg", results, 2);
			free(body);
			free(base64Body);
		} else {
			syslog(LOG_ALERT, "welll not an im delivery");
		}
		buffer += contentLength;
		int between = (char*)buffer - echoBuffer;
		syslog(LOG_ALERT, "welll read %d length and received : %d", between, recvMsgSize);
		int left = recvMsgSize - between;
		if(left > 0) {
			syslog(LOG_ALERT, "need to be used next loop %d", left);

			MM_SMCP_CMD_TYPE cmdTypeTest = (MM_SMCP_CMD_TYPE)(ntohs(*(uint16_t*)buffer));
			//syslog(LOG_ALERT, "welll recving msg type left1111: %d --------------->", cmdTypeTest);
			//return NULL;
			return left;
			//return (char*)buffer;
			/*
				 char* todo = (char*)malloc(left);
				 memcpy(todo, buffer, left);
				 onIOBuffer(left, todo);
				 free(todo);
				 */

			/*
				 memcpy(echoBuffer, buffer, left);
				 memset(echoBuffer + left, 0, 1);
				 syslog(LOG_ALERT, "need to be used next loop copied!----%s", echoBuffer);
				 */
		} else {
			syslog(LOG_ALERT, "welll all data done");
			//return NULL;
			return 0;
		}
	} else {
		syslog(LOG_ALERT, "welll not enough content : %d", contentLength);
		int rd = ((char*)buffer - echoBuffer);
		syslog(LOG_ALERT, "welll not enough current : %d", recvMsgSize - rd);
		return recvMsgSize;//return echoBuffer;
	}
}

void onSIGIO() {
	pthread_mutex_lock(&mutex);
	syslog(LOG_ALERT, "----+---->welll sigio called");
	struct sockaddr_in serveraddr;    /* Address of datagram source */
	int recvMsgSize;                  /* Size of datagram */
	char echoBuffer[MAX_BUFFER_LEN]={0};  /* Datagram buffer */
	int left = 0;

	do  /* As long as there is input... */
	{
		if(bufferedSize > 0) {
			syslog(LOG_ALERT, "welll still buffer to be filled: %d", bufferedSize);
			memcpy(echoBuffer, buffered, bufferedSize);
		}
		if(left > 0) {
			//syslog(LOG_ALERT, "need to be used left loop data!----%s", echoBuffer);
			syslog(LOG_ALERT, "need to be used left loop data length!----%d", left);
		}
		int readCount = MAX_BUFFER_LEN - left - bufferedSize;
		syslog(LOG_ALERT, "welll data will be read: %d", readCount);
		recvMsgSize = recv(sock, echoBuffer + left + bufferedSize, readCount, 0);
		if(recvMsgSize <= 0) {
			if(left > 0) {
				memcpy(buffered, echoBuffer, left);
				bufferedSize = left;
				syslog(LOG_ALERT, "welll still buffer to be filled on left : %d", bufferedSize);
			}
			left = 0;
			break;
		}
		syslog(LOG_ALERT, "welll msg read length!----%d, left %d", recvMsgSize, left);
		recvMsgSize += left;
		recvMsgSize += bufferedSize;
		left = 0;
		bufferedSize = 0;
		if (recvMsgSize > 0)
		{
			if(recvMsgSize < 8) {
				syslog(LOG_ALERT, "welll short than 8, %d, keep this data for next use", recvMsgSize);
				bufferedSize = recvMsgSize;
				memcpy(buffered, echoBuffer, recvMsgSize);
				break;
			} else {
				syslog(LOG_ALERT, "welll this all loop msg size %d", recvMsgSize);
			}

			char* handled = echoBuffer;
			int sized = recvMsgSize;
			int todo = 0;
			char* lastLoop;
			char* buffering;
			do {
				lastLoop = handled;
				todo = onIOBuffer(sized, handled, buffering);
				if(todo > 0) {
					if(todo != sized) {
						handled += (sized - todo);
						sized = todo;//handled - lastLoop;
						syslog(LOG_ALERT, "welll left sized after last loop=================>%d", sized);
					} else {
						bufferedSize = sized;
						memcpy(buffered, handled, sized);
						syslog(LOG_ALERT, "welll all left sized =================>%d, %d", sized, handled - lastLoop);

						MM_SMCP_CMD_TYPE cmdTypeTest = (MM_SMCP_CMD_TYPE)(ntohs(*(uint16_t*)buffered));
						syslog(LOG_ALERT, "welll recving msg type left1111: %d --------------->", cmdTypeTest);
						break;
					}
				} else {
					break;
				}
			} while (true);
			if(todo > 0 && sized > 0) {
				//left = sized;
				syslog(LOG_ALERT, "welll recving msg handled lefting : %d --------------->total %d", sized, recvMsgSize);
				//memcpy(echoBuffer, handled, left);
				//syslog(LOG_INFO, "left buffer copied!");
			}
			continue;
		}
		else if (recvMsgSize == 0)
		{
			//closeSocketOnly();
			//reconnect();
			//didReceiveData("connection closed");
			//return;
			syslog(LOG_ALERT, "no more data");
			break;
		}
		else
		{
			/* Only acceptable error: recvfrom() would have blocked */
			if (errno != EWOULDBLOCK){
				printf("recvfrom() failed");
				//return;
				break;
			}
		}
	}  while (recvMsgSize > 0);
	syslog(LOG_ALERT, "welll done sigio! %d", bufferedSize);
	/* Nothing left to receive */
	pthread_mutex_unlock(&mutex);
}

void SIGIOHandler(int signum, siginfo_t *info, void *uap)
{
	//TODO send user event sigio or muliti called
	SDL_Event event;
	event.type = SDL_USEREVENT;
	event.user.code = 103;
	SDL_PushEvent(&event);
}

int currentUpPackNum = 0;
void sendMsgs(MM_SMCP_CMD_TYPE cmdTypeRaw, int packNumberIn, char* orig, const char* receiver) {
	//send 1v1 msg( chat and roger)
	//
	syslog(LOG_ALERT, "sending msg content: %s --- receiver: %s", orig, receiver);

	if(sock < 0) {
		syslog(LOG_ERR, "sending msg error, socket not avaliable");
		reconnect();
		return;
	}
	MOMO_SENDING_MSG msg;
	msg.upPackNumber = packNumberIn;
	msg.msg = orig;

	char buf[2048] = {0};

	char* index = buf;
	//cmdType
	uint16_t cmdType = htons((uint16_t)cmdTypeRaw);
	memcpy(index, &cmdType, sizeof(cmdType));
	index+=sizeof(cmdType);

	//pack head
	uint16_t packHead = 0;
	if(msg.upPackNumber > 0) {
		packHead = packHead | 0x4;
	}

	uint16_t packNet = htons((uint16_t)packHead);
	memcpy(index, &packNet, sizeof(packNet));
	index+=sizeof(packNet);

	//pack number
	if(msg.upPackNumber > 0) {
		uint32_t packNumber = htonl((uint32_t)msg.upPackNumber);
		memcpy(index, &packNumber, sizeof(packNumber));
		index+=sizeof(packNumber);
	}

	uint16_t rLen = 0;
	uint16_t cLen = 0;
	if(msg.msg != NULL) {
		cLen = strlen(msg.msg);
	}
	if(receiver != NULL) {
		rLen = strlen(receiver);
	}
	uint32_t totalLength = cLen + rLen;
	if(rLen > 0) {
		totalLength += sizeof(uint16_t);
	}

	uint32_t totalNet = htonl(totalLength);
	memcpy(index, &totalNet, sizeof(totalNet));
	index+=sizeof(totalNet);

	if(rLen > 0) {
		//receiver len
		uint16_t rLenNet = htons(rLen);
		memcpy(index, &rLenNet, sizeof(rLenNet));
		index+=sizeof(rLenNet);

		//receiver data
		memcpy(index, receiver, rLen);
		index+=rLen;
	}

	//content
	memcpy(index, msg.msg, cLen);
	index+=cLen;

	int r = send(sock, buf, index - buf, 0);
	syslog(LOG_ALERT, "msg send result: %d", r);
	if(r == -1) {
		reconnect();
	}
}
void sendMsg1V1(char* orig, const char* receiver) {
	char* decoded = base64_decode(orig, strlen(orig));
	//TODO free orig?
	sendMsgs(SMCP_IM_1V1, currentUpPackNum, decoded, receiver);
}


char *base64_encode(const unsigned char *input, int length)
{
	BIO *bmem, *b64;
	BUF_MEM *bptr;

	b64 = BIO_new(BIO_f_base64());
	bmem = BIO_new(BIO_s_mem());
	b64 = BIO_push(b64, bmem);
	BIO_write(b64, input, length);
	BIO_flush(b64);
	BIO_get_mem_ptr(b64, &bptr);

	char *buff = (char *)malloc(bptr->length);
	memcpy(buff, bptr->data, bptr->length-1);
	buff[bptr->length-1] = 0;

	BIO_free_all(b64);

	return buff;
}

char *base64_decode(char *input, int length)
{
	BIO *b64, *bmem;

	char *buffer = (char *)malloc(length+1);
	memset(buffer, 0, length+1);

	b64 = BIO_new(BIO_f_base64());
	BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
	bmem = BIO_new_mem_buf(input, length);
	bmem = BIO_push(b64, bmem);

	BIO_read(bmem, buffer, length);
	buffer[length] = '\0';

	BIO_free_all(bmem);

	return buffer;
}
