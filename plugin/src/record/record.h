/**
 * recorder
 * Tsung W.<tsung.bz@gmail.com>
 */

#ifndef MRECORD_H
#define MRECORD_H

#include <stdlib.h>
#include <stdio.h>
#include <pthread.h>
#include <sched.h>
#include <string.h>
#include <syslog.h>

#include "alsa/asoundlib.h"

#include "../amr/wave2amr/wavreader.h"

extern int startRecord(const char* path);
extern void stopRecord();

#endif
