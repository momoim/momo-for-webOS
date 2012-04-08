/**
	Palm disclaimer
 **/
#include <stdio.h>
#include <math.h>
#include <syslog.h>
#include <signal.h>


#include <GLES2/gl2.h>
#include "SDL.h"
#include "PDL.h"
#include "amr/wave2amr/wav_amr.h"

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


//FIXME how to notify amr convert fail?
PDL_bool wave_to_amr(PDL_JSParameters *params) {
	int num = PDL_GetNumJSParams(params);
	if(num == 2) {
		syslog(LOG_ALERT, "wave to amr param num: %d", num);
		const char* infile = PDL_GetJSParamString(params, 0);
		syslog(LOG_ALERT, "wave to amr param num: %s", infile);
		const char* outfile = PDL_GetJSParamString(params, 1);
		syslog(LOG_ALERT, "wave to amr param num: %s", outfile);
		int what = encode_amr(infile, outfile);
		if(what == 0) {
			PDL_JSReply(params, "ok");
			return PDL_TRUE;
		}
	}
	PDL_JSReply(params, "fail");
	return PDL_FALSE;
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
	SDL_Event Event;
	int cont = 1;
	do {
		SDL_WaitEvent(&Event);
	} while (Event.type != SDL_QUIT);
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

	return 0;
}
