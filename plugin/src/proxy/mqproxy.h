/**
 * msg proxy without amqp
 * Tsung W.<tsung.bz@gmail.com>
 */

#ifndef MQPROXY_H
#define MQPROXY_H

extern int openSocket(const char* addr, unsigned short port, const char* auth);

extern void closeSocket();
extern void setHeartBeatTimer();
extern void sendMsg1V1(char* msg, const char* receiver);

typedef struct 
{
	int upPackNumber;
	const char* msg;
} MOMO_SENDING_MSG;


typedef enum {
    SMCP_UNKNOWW = 0,
    
    //连接管理消息
    SMCP_SYS_HEARTBEAT = 0x0001,						//心跳： 0x0001(1)
                                                        //包体为空
    SMCP_SYS_HEARTBEAT_MODI_REQUEST = 0x0011,		//修改心跳时间：0x0011(17)上行
    SMCP_SYS_HEARTBEAT_MODI = 0x0012,				//修改心跳事件响应：0x0012(18)下行
    
    SMCP_SYS_LOGIN_TOKEN = 0x0101,					//token登录请求：0x0101(257)(不可用)
    SMCP_SYS_LOGIN_TOKEN_RESPONSE = 0x0102,			//token登录响应：0x0102(258)
    
    
    SMCP_SYS_LOGIN_ACCPWD = 0x0111,					//用户名密码登录： 0x0111(273)（不可用）
    SMCP_SYS_LOGIN_ACCPWD_RESPONSE = 0x0112,			//登录响应：0x0112(274)(不可用)
    
    SMCP_SYS_LOGOUT = 0x0f01,							//登出通知：0x0f01(3841)上行
    
    //c2s:	
    //c2s-通讯簿相关请求？
    //c2s-http代理请求消息
    SMCP_HTTP_PROXY_REQUEST = 0x1f01,				//http代理请求：0x1f01(7937)
    SMCP_HTTP_PROXY_RESPONSE = 0x1f02,				//http代理请求响应：0x1f02(7938)
    
    
    //s2c:
    //s2c-通讯簿相关消息？
    //s2c-mq转发消息：系统消息
    SMCP_SM_NOTICE = 0x2f01,					//下发系统消息：0x2f01(12033)
    
    //c2c-mq转发消息:普通文本消息
    SMCP_IM_1V1 = 0x3001,								//普通单对单：0x3001(12289)
    SMCP_IM_1V1_RESPONSE = 0x3002,					//普通单对单响应：0x3002(12290)
    
    SMCP_IM_1V1_NO_UID = 0x3011,						//普通单对单:无uid, 0x3011(12305)
    SMCP_IM_1V1_NO_UID_RESPONSE = 0x3012,				//普通单对单:无uid响应, 0x3012(12306)
    
    SMCP_IM_1VN = 0x3101,								//普通单对多：0x3101(12545)
    SMCP_IM_1VN_RESPONSE = 0x3102,					//普通单对多响应：0x3102(12546)
    
    SMCP_IM_DELIVER = 0x3f01,					//下发普通mq消费消息： 0x3f01(16129)
    SMCP_IM_DELIVER_RESPONSE = 0x3f02,				//下发普通mq消费消息响应：0x3f02(16130)
    
    //c2c-mq转发消息：语音消息
    SMCP_AUDIO_1V1 = 0x4001,							//语音单对单: 0x4001(16385)
    SMCP_AUDIO_1V1_FIN_ACK = 0x4013,                    //单对单边录边传接收完毕
    
    SMCP_AUDIO_DELIVER = 0x4f01,						//下发语音mq消费消息：0x4f01(20225)
    
    //c2c群组消息
    
    
} MM_SMCP_CMD_TYPE;
#endif
