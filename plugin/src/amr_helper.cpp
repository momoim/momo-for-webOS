/**
	Palm disclaimer
 **/
#include <stdio.h>
#include <syslog.h>
#include <signal.h>
#include <pthread.h>

#include "SDL.h"
#include "PDL.h"
#include "amr/wave2amr/wav_amr.h"
#include "proxy/mqproxy.h"

#define WHAT_AMR_COMPRESS 101
#define WHAT_AMR_THREAD 102
#define WHAT_PROXY_HEART 103

typedef struct 
{
	int what;
	char* infile;
	char* outfile;
	char* duration;
} MOMO_WaveAmrAudio;

#ifdef WIN32
extern "C" 
#endif

void cleanup(int sig) {
	syslog(LOG_INFO, "Cleanup caused by: %d", sig);
	closelog();
	PDL_Quit();
}

void sighandler(int sig) {
	cleanup(sig);
	exit(0);
}

void* compress(void* info) {
	syslog(LOG_ALERT, "wave to amr compress");
	MOMO_WaveAmrAudio* audio = (MOMO_WaveAmrAudio*) info;
	syslog(LOG_ALERT, "wave to amr compress: %s", audio->infile);
	int what = encode_amr(audio->infile, audio->outfile);
	SDL_Event event;
	event.type = SDL_USEREVENT;
	event.user.code = WHAT_AMR_COMPRESS;
	audio->what = what;
	event.user.data1 = info;
	pthread_t self = pthread_self();
	event.user.data2 = (void *)&self;
	SDL_PushEvent(&event);
	syslog(LOG_ALERT, "wave to amr event pushed compress");
}


PDL_bool wave_to_amr(PDL_JSParameters *params) {
	int num = PDL_GetNumJSParams(params);
	syslog(LOG_ALERT, "wave to amr param num: %d", num);
	if(num == 3) {
		PDL_JSReply(params, "ok");
		const char* infile = PDL_GetJSParamString(params, 0);
		syslog(LOG_ALERT, "wave to amr param num: %s", infile);
		const char* outfile = PDL_GetJSParamString(params, 1);
		syslog(LOG_ALERT, "wave to amr param num: %s", outfile);
		MOMO_WaveAmrAudio* audio = (MOMO_WaveAmrAudio*)malloc(sizeof(MOMO_WaveAmrAudio));
		int lenIn = strlen(infile) + 1;
		syslog(LOG_ALERT, "wave to amr param copied===>: %d", lenIn);
		audio->infile = (char*)malloc(lenIn);
		memcpy(audio->infile, infile, lenIn);
		syslog(LOG_ALERT, "wave to amr param copied===>: %s", audio->infile);

		int lenOut = strlen(outfile) + 1;
		audio->outfile = (char*)malloc(lenOut);
		memcpy(audio->outfile, outfile, lenOut);
		const char* duration = PDL_GetJSParamString(params, 2);
		int lenD = strlen(duration) + 1;
		audio->duration = (char*)malloc(lenD);
		memcpy(audio->duration, duration, lenD);

		SDL_Event event;
		event.type = SDL_USEREVENT;
		event.user.code = WHAT_AMR_THREAD;
		event.user.data1 = (void *) audio;
		SDL_PushEvent(&event);
		syslog(LOG_ALERT, "wave to amr event pushed thread");


		syslog(LOG_ALERT, "wave to amr ending");


		return PDL_TRUE;
	}
	PDL_JSReply(params, "fail: unknown");
	return PDL_FALSE;
}

PDL_bool open_socket(PDL_JSParameters *params) {
	syslog(LOG_ALERT, "open socket callled!!");
	int num = PDL_GetNumJSParams(params);
	PDL_Err err = PDL_JSReply(params, "hello");
	const char *addr = PDL_GetJSParamString(params, 0);
	int port = PDL_GetJSParamInt(params, 1);
	const char *auth = PDL_GetJSParamString(params, 2);
	openSocket(addr, port, auth);
	if(err != PDL_NOERROR) {
		return PDL_FALSE;
	}
	return PDL_TRUE;
}


PDL_bool close_socket(PDL_JSParameters *params)
{
	syslog(LOG_ALERT, "close socket callled!!");
	closeSocket();

	return PDL_TRUE;
}

PDL_bool sendMsg(PDL_JSParameters *params) {
	int num = PDL_GetNumJSParams(params);
	syslog(LOG_ALERT, "sendMsg callled!!args : %d", num);
	if(num > 1) {
		const char* receiver = PDL_GetJSParamString(params, 0);

		char total[1024] = {0};

		int now = 1;
		char* index = total;
		while(now <= num) {
			const char* curr = PDL_GetJSParamString(params, now);
			memcpy(index, curr, strlen(curr));
			index += strlen(curr);
			++now;
		}
		sendMsg1V1(total, receiver);
	}
	PDL_Err err = PDL_JSReply(params, "ok");
	return PDL_TRUE;
}

PDL_bool JSHandlerFunc(PDL_JSParameters *params) {
	syslog(LOG_ALERT, "foo callled!!");
	int num = PDL_GetNumJSParams(params);
	//PDL_JSReply(params, foo());
	PDL_Err err = PDL_JSReply(params, "hello");
	if(err != PDL_NOERROR) {
		return PDL_FALSE;
	}
	return PDL_TRUE;
}

int plugin_client_init() {
	int ret = 0;
	ret += PDL_RegisterJSHandler("foo", JSHandlerFunc);
	ret += PDL_RegisterJSHandler("wave2amr", wave_to_amr);
	ret += PDL_RegisterJSHandler("openSocket", open_socket);
	ret += PDL_RegisterJSHandler("closeSocket", close_socket);
	ret += PDL_RegisterJSHandler("sendMsg", sendMsg);
	return ret;
}

PDL_Err plugin_initialize() {

	syslog(LOG_ALERT, "Initializing Plugin");

	SDL_Init(SDL_INIT_VIDEO);
	PDL_Init(0);

	//setup_event_callbacks();

	if (plugin_client_init() > 0) {
		syslog(LOG_ERR, "JS handler registration failed");
		//return -1;
		return PDL_EOTHER;
	}

	PDL_JSRegistrationComplete();

	return PDL_CallJS("ready", NULL, 0);
}


void plugin_start() {
	SDL_Event event;
	int cont = 1;
	do {
		SDL_WaitEvent(&event);
		if(event.type == SDL_USEREVENT) {
			syslog(LOG_ALERT, "wave to amr event poll%d", event.user.code);

			if(event.user.code == WHAT_AMR_THREAD) {
				MOMO_WaveAmrAudio* audio = (MOMO_WaveAmrAudio*) event.user.data1;
				syslog(LOG_ALERT, "thread starting: infile===>%s", audio->infile);
				syslog(LOG_ALERT, "thread starting: what===>%s", (char*)event.user.data2);
				pthread_t thread;
				pthread_create(&thread, NULL, compress, event.user.data1);
				syslog(LOG_ALERT, "wave to amr event thread created");
				pthread_detach(thread);
			}  else if(event.user.code == WHAT_PROXY_HEART) {
				setHeartBeatTimer();
				} else {
				MOMO_WaveAmrAudio* audio = (MOMO_WaveAmrAudio*) event.user.data1;
				syslog(LOG_ALERT, "compressed: what===>%d", audio->what);
				syslog(LOG_ALERT, "compressed: duration===>%s", audio->duration);
				const char* results[4];
				if(audio->what == 0) {
					results[0] = "success";
				} else {
					results[0] = "fail";
				}
				results[1] = audio->infile;
				results[2] = audio->outfile;
				results[3] = audio->duration;
				//PDL_CallJS("ready", NULL, 0);
				PDL_CallJS("onAmr", results, 4);
				syslog(LOG_ALERT, "wave to amr event onAmr called");

				//FIXME why cant stop thread this way
				//end thread
				//pthread_join((pthread_t)event.user.data2, NULL);

				//free memory
				free(audio->infile);
				audio->infile = NULL;
				free(audio->outfile);
				audio->outfile = NULL;
				free(audio->duration);
				audio->duration = NULL;
				free(audio);
				audio = NULL;
			}

			//PDL_CallJS("ready", NULL, 0);
			//syslog(LOG_ALERT, "wave to amr event ready called");
		}
	} while (event.type != SDL_QUIT);
}

int main(int argc, char** argv)
{
	signal(SIGINT, sighandler);
	signal(SIGTERM, sighandler);
	signal(SIGQUIT, sighandler);
	signal(SIGHUP, sighandler);
	signal(SIGKILL, sighandler);

	openlog("momo.im.app.plugin.amr", LOG_PID, LOG_USER);

	int ret = plugin_initialize();
	if (ret == PDL_NOERROR) {
		syslog(LOG_NOTICE, "JS handler registration complete");
		plugin_start();
	} else {
		syslog(LOG_ERR, "JS handler registration failed: %d", ret);
	}

	cleanup(-1);
	syslog(LOG_NOTICE, "return 0 called");

	return 0;
}
