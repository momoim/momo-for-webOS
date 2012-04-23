#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>

#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <arpa/inet.h>

#include "SDL.h"
#include "PDL.h"
#include <syslog.h>

#include "mqproxy.h"
#define MAX_BUFFER_LEN 2048

#define ntohll(x) ( ( (uint64_t)(ntohl( (uint32_t)((x << 32) >> 32) )) << 32) | ntohl( ((uint32_t)(x >> 32)) ) )                                        
#define htonll(x) ntohll(x)

int sock;

void didConnected(const char* auth);
void SIGIOHandler(int, siginfo_t *info, void *uap); /* Function to handle SIGIO */

void closeSocket(){
	close(sock);
}

int openSocket(const char* addr, unsigned short port, const char* auth) {
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
	sockaddr.sin_addr.s_addr = inet_addr(addr);
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

void SIGIOHandler(int signum, siginfo_t *info, void *uap)
{
	syslog(LOG_ALERT, "sigio called");
	struct sockaddr_in serveraddr;    /* Address of datagram source */
	unsigned int clntLen;             /* Address length */
	int recvMsgSize;                  /* Size of datagram */
	char echoBuffer[MAX_BUFFER_LEN];  /* Datagram buffer */

	do  /* As long as there is input... */
	{
		clntLen = sizeof(serveraddr);

		if ((recvMsgSize = recvfrom(sock, echoBuffer, MAX_BUFFER_LEN, 0,
						(struct sockaddr *) &serveraddr, &clntLen)) > 0)
		{
			if(recvMsgSize < 8) break;

			//head
			uint8_t* buffer = (uint8_t*)echoBuffer;
			int byteCount = 0;

			//cmd
			MM_SMCP_CMD_TYPE cmdType = (MM_SMCP_CMD_TYPE)(ntohs(*(uint16_t*)buffer));
			buffer += sizeof(uint16_t);
			byteCount += sizeof(uint16_t);

			//flags
			uint16_t packHead = ntohs(*(uint16_t*)buffer);
			buffer += sizeof(uint16_t);
			byteCount += sizeof(uint16_t);

			uint64_t uid = 0;
			if (packHead & 0x20) {
				if (recvMsgSize < byteCount + sizeof(uint64_t) + sizeof(uint32_t)) break;

				uid = ntohll(*(uint64_t*)buffer);
				buffer += sizeof(uint64_t);
				byteCount += sizeof(uint64_t);
			}

			uint64_t timeStamp = 0;
			if (packHead & 0x10) {
				if (recvMsgSize < byteCount + sizeof(uint64_t) + sizeof(uint32_t)) break;

				timeStamp = ntohll(*(uint64_t*)buffer);
				buffer += sizeof(uint64_t);
				byteCount += sizeof(uint64_t);
			}

			//下行包序号
			int downPackNumber = 0;
			if (packHead & 0x8) {
				if (recvMsgSize < byteCount + sizeof(uint32_t) + sizeof(uint32_t)) break;

				downPackNumber = ntohl(*(uint32_t*)buffer);
				buffer += sizeof(uint32_t);
				byteCount += sizeof(uint32_t);
			}

			//上行包序号
			int upPackNumber = 0;
			if (packHead & 0x4) {
				if (recvMsgSize < byteCount + sizeof(uint32_t) + sizeof(uint32_t)) break;

				upPackNumber = ntohl(*(uint32_t*)buffer);
				buffer += sizeof(uint32_t);
				byteCount += sizeof(uint32_t);
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
			}

			//length
			if (recvMsgSize < byteCount + 4) break;
			int contentLength = ntohl(*(uint32_t*)buffer);
			buffer += sizeof(uint32_t);
			byteCount += sizeof(uint32_t);

			//check content
			if(recvMsgSize >= byteCount + contentLength) {
				syslog(LOG_ALERT, "recving msg type: %d, timestamp: %d", cmdType, timeStamp);
				
				if(cmdType == SMCP_IM_DELIVER) {
					char* body = (char*)malloc(contentLength + 1);
					memcpy(body, buffer, contentLength);
					char* last = body + contentLength;
					memset(last, 0, 1);
					syslog(LOG_ALERT, "length: %d, recving msg conetnt!!!: %s", contentLength, body);

					//call js
					const char* results[2];
					results[0] = body;
					char* time;
					sprintf(time, "%d", timeStamp);
					results[1] = time;
					PDL_CallJS("onProxyMsg", results, 2);
					free(body);
				} else {
					syslog(LOG_ALERT, "not an im delivery");
				}
			}

			/*
				 echoBuffer[recvMsgSize] = '\0';
				 didReceiveData(echoBuffer);
				 if (sendto(sock, echoBuffer, recvMsgSize, 0, (struct sockaddr *) 
				 &serveraddr, sizeof(serveraddr)) != recvMsgSize){
				 printf("sendto() failed");
				 return;
				 }
				 */
		}
		else if (recvMsgSize == 0)
		{
			closeSocket();
			didReceiveData("connection closed");
			return;
		}
		else
		{
			/* Only acceptable error: recvfrom() would have blocked */
			if (errno != EWOULDBLOCK){
				printf("recvfrom() failed");
				return;
			}
		}
	}  while (recvMsgSize > 0);
	/* Nothing left to receive */
}
