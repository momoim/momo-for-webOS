var libraries = MojoLoader.require({
	name: "foundations",
	version: "1.0"
});
var Future = libraries["foundations"].Control.Future;
var DB = libraries["foundations"].Data.DB;
var PalmCall = libraries["foundations"].Comms.PalmCall;

//node.js orig require style
if (typeof require === 'undefined') {
	require = IMPORTS.require;
}

//node.js
var http = require('http');
var net = require('net');
var fs = require('fs');

function guidGenerator() {
	var S4 = function() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	var split = "-";
	return (S4() + S4() + split + S4() + split + S4() + split + S4() + split + S4() + S4() + S4());
}

var NodeService = function() {
	this.mSubscriptions = [];
	this.mID = 0;
};

//singleton
NodeService.instance = function() {
	if (NodeService.mInstance == null) {
		NodeService.mInstance = new NodeService();
		NodeService.mInstance.init();
	}
	return NodeService.mInstance;
}

NodeService.prototype = {
	init: function() {
		var that = this;

		//read database config or something
	},
	getID: function() {
		return guidGenerator();
		var that = this;

		var result = 'sub_' + that.mID; ++that.mID;
		return result;
	},
	subscribe: function(sub) {
		console.log('subscribe: ' + sub.sname);
		var that = this;

		if (that.mSubscriptions == null) {
			that.mSubscriptions = [];
		}
		that.mSubscriptions.push(sub);
	},
	unsubscribe: function(sub) {
		var that = this;

		if (sub == null) return;
		for (var i = 0; i < that.mSubscriptions.length; ++i) {
			var curr = that.mSubscriptions[i];
			if (curr.sname == sub.sname) {
				that.mSubscriptions.splice(i, 1);
				break;
			}
		}
	},
	sendMsgFail: function(chat) {
				PalmCall.call('palm://com.palm.applicationManager', 'open', {
				'id': 'momo.im.app',
				'params': {
					'action': 'onMsgSendError',
					'data': JSON.stringify(chat)
				}
			});
	},
	send: function(f, total) {
		var that = this;
		var info = total.auth;
		var chat = total.chat;

		if (that.authInfo == null || that.authInfo.user == null) {
			if(chat.kind == 'sms') {
				//that.sendMsgWithHttp(chat.data);
				that.sendMsgFail(chat);
			}
			that.auth(f, info);
		} else {
			var will = {
				kind: chat.kind,
				data: chat.data
			}
			var oid;
			if(will.kind == 'sms') {
				oid = chat.data.receiver[0].id;
				that.mqClient.sendMsg(oid + '.' + that.authInfo.user.id, will);
			}
			if(will.kind == 'roger') {
				oid = chat.data.receiver;
				that.mqClient.sendMsg(oid + '', JSON.stringify(will));
			}
			console.log('sending to: ' + oid);
		}
	},
	sendMsgWithHttp: function(chat) {
		var that = this;
		that.httpReq('POST', '/im/send_message.json', chat, function(result) {
			var chated = {
				kind: 'im',
				data: JSON.parse(result)
			}
			console.log('on msg send end');
			PalmCall.call('palm://com.palm.applicationManager', 'open', {
				'id': 'momo.im.app',
				'params': {
					'action': 'onNewIncome',
					'data': JSON.stringify(chated)
				}
			});
		},
		function(response) {
			var status = response.statusCode;
			console.log('send msg fail ' + status);
		});
	},
	auth: function(f, info) {
		var that = this;

		console.log('oauthToken: ' + info.oauthToken);
		console.log('tokenSecret: ' + info.tokenSecret);
		console.log('queueName: ' + info.queueName);
		that.authInfo = info;
		if (that.authInfo != null) {
			if (that.mqClient != null && that.mqClient.isAlive()) {
				console.log('connection is still alive');
				f.result = {
					alive: true
				};
				return;
			} else {
				console.log('connection is not alive');
			}
		}
		that.refreshUnread(f);

		that.path = fs.realpathSync('.');
		var MomoMQ = require(that.path + '/mq/momomq');
		that.mqClient = new MomoMQ(that);
	},
	refreshUnread: function(f) {
		var that = this;
		that.httpReq('GET', '/im/all.json', '', function(chatResult) {
			console.log('on chat list end');
			PalmCall.call('palm://com.palm.applicationManager', 'open', {
				'id': 'momo.im.app',
				'params': {
					'action': 'onUnreadList',
					'data': chatResult
				}
			});
			f.result = {
				hello: 'got im data ' + chatResult,
				data: chatResult
			}
		},
		function(response) {
			var status = response.statusCode;
			console.log('get im all fail ' + status);
			f.result = {
				errorCode: status
			};
		});
	},
	httpReq: function(method, path, json, onSuccess, onFail) {
		var params = '';
		if (json != null && json != '') {
			params = JSON.stringify(json);
		}
		var that = this;
		var url = Setting.protocol + Setting.api + path;
		var timestamp = OAuth.timestamp();
		var nonce = OAuth.nonce(20);
		var accessor = {
			consumerSecret: "b2734cdb56e00b01ca19d6931c6f9f30",
			tokenSecret: that.authInfo.tokenSecret
		};
		var message = {
			method: method,
			action: url,
			parameters: OAuth.decodeForm(params)
		};
		message.parameters.push(['oauth_consumer_key', "15f0fd5931f17526873bf8959cbfef2a04dda2d84"]);
		message.parameters.push(['oauth_nonce', nonce]);
		message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
		message.parameters.push(['oauth_timestamp', timestamp]);
		message.parameters.push(['oauth_token', that.authInfo.oauthToken]);
		message.parameters.push(['oauth_version', '1.0']);
		message.parameters.sort()
		OAuth.SignatureMethod.sign(message, accessor);
		var authHeader = OAuth.getAuthorizationHeader("", message.parameters);

		//get data with node.js
		var opts = {
			host: Setting.api,
			port: 80,
			path: path,
			headers: {
				'HOST': Setting.api,
				"Authorization": authHeader
			}
		};
		//old school node.js
		var httpClient = http.createClient(opts.port, opts.host);
		var request = httpClient.request(method, opts.path, opts.headers);

		request.on('response', function(response) {
			var status = response.statusCode;
			if (status !== 200) {
				onFail(response);
			} else {
				var reqResult = '';
				response.on('data', function(chunk) {
					reqResult += chunk;
					console.log('on req chunk: ' + chunk.length);
				});
				response.on('end', function() {
					onSuccess(reqResult);
				});
			}
		});

		if (method == 'POST' || method == 'post') {
			request.write(params);
		}

		request.end();
	},
	receive: function(dataMsg) {
		var that = this;

		PalmCall.call('palm://com.palm.applicationManager', 'open', {
			'id': 'momo.im.app',
			'params': {
				'action': 'onNewIncome',
				'data': JSON.stringify(dataMsg)
			}
		});
	}
};

