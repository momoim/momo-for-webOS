/**
 * msg proxy without amqp
 * Tsung W.<tsung.bz@gmail.com>
 */

#ifndef MQPROXY_H
#define MQPROXY_H

extern int openSocket(const char* addr, unsigned short port, const char* auth);

extern void closeSocket();

#endif
