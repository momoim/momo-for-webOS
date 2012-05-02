/**
 * file assistant
 * Tsung W.<tsung.bz@gmail.com>
 */

#ifndef MFILEE_H
#define MFILEE_H

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <sys/stat.h>

#define MOMO_RECORD "/media/internal/momo"
#define MOMO_CACHE "/media/internal/.momo"
#define MOMO_CACHE_AUDIO MOMO_CACHE"/audio"
#define MOMO_CACHE_FILE MOMO_CACHE"/file"
#define MOMO_CACHE_PHOTO MOMO_CACHE"/photo"

extern void do_mkdir(const char* path);
extern void mkdirs();
extern int onFileRename(const char* path1, const char* path2);
extern void onFileDel(const char* path);
extern int onFileInfo(const char* path);

#endif
