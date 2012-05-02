#include "filee.h"

void do_mkdir(const char* path) {
	int status = 0;

	/* Directory does not exist */
	mkdir(path, 0755);
};

void mkdirs() {
	do_mkdir(MOMO_RECORD);
	do_mkdir(MOMO_CACHE);
	do_mkdir(MOMO_CACHE_AUDIO);
	do_mkdir(MOMO_CACHE_FILE);
	do_mkdir(MOMO_CACHE_PHOTO);
};

int onFileRename(const char* path1, const char* path2) {
	int what = rename(path1, path2);
	syslog(LOG_ALERT, "file rename result: %d", what);
};
void onFileDel(const char* path) {
	int what = remove(path);
	syslog(LOG_ALERT, "file remove result: %d", what);
};

int onFileInfo(const char* path) {
	struct stat st;
	int what = stat(path, &st);
	syslog(LOG_ALERT, "file info result: %d", what);
	return what;
};
