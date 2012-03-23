interfaces.Momo = function() {
	var http = new net.Http();
	var hostUrl = Setting.protocol + Setting.api;

	// 登陆
	this.postUserLogin = function(user, callbacks) {
		return this.postWithoutAuth('/user/login.json', user, callbacks);
	};

	// 发送消息
	this.postSendMessage = function(chat, callbacks) {
		var data;
		if(!chat.kind) {
			data = chat;
		} else {
			data = chat.data;
		}
		return this.post('/im/send_message.json', data, callbacks);
	};

	// 根据手机号获取用户信息
	this.postUserShowByMobile = function(people, callbacks) {
		return this.post('/user/show_by_mobile.json', people, callbacks);
	};

	// 获取未读私聊数据
	this.getIMAll = function(callbacks) {
		//Mojo.Log.info('getIMAll------------');
		return this.get('/im/all.json', callbacks);
	};

	// 创建帐号
	this.postRegisterCreate = function(user, callbacks) {
		return this.postWithoutAuth('/register/create.json', user, callbacks);
	};

    //手机验证码校验
    this.postRegisterVerify = function(user, callbacks) {
		return this.postWithoutAuth('/register/verify.json', user, callbacks);
    };

    //重发验证码
    this.postResendVerifyCode = function(user, callbacks) {
		return this.postWithoutAuth('/register/resend_verifycode.json', user, callbacks);
    };

    //完善个人信息
    this.postUserPersonal = function(user, callbacks) {
		return this.post('/user/personal.json', user, callbacks);
    };

	// 上传照片
	this.postPhotoUpload = function(controller, file, callbacks) {
		return this.upload(controller, '/photo/upload.json', file, callbacks);
	};

	// 上传文件
	this.postFileUpload = function(controller, file, callbacks) {
		return this.upload(controller, '/file/upload.json', file, callbacks);
	};

	this.postWithoutAuth = function(path, thing, callbacks) {
		var url = hostUrl + path;
		return http.post(url, JSON.stringify(thing), [], callbacks);
	};

	this.get = function(url, callbacks) {
		return this.action('GET', url, '', callbacks);
	};

	this.post = function(url, params, callbacks) {
		return this.action('POST', url, params, callbacks);
	};

	this.action = function(method, url, params, callbacks) {
		var fullUrl = hostUrl + url;
		var timestamp = OAuth.timestamp();
		var nonce = OAuth.nonce(20);
		var accessor = {
			consumerSecret: "b2734cdb56e00b01ca19d6931c6f9f30",
			tokenSecret: Global.authInfo.tokenSecret
		};
		var message = {
			method: method,
			action: fullUrl,
			parameters: OAuth.decodeForm(method == 'POST' ? JSON.stringify(params) : '')
		};
		message.parameters.push(['oauth_consumer_key', "15f0fd5931f17526873bf8959cbfef2a04dda2d84"]);
		message.parameters.push(['oauth_nonce', nonce]);
		message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
		message.parameters.push(['oauth_timestamp', timestamp]);
		message.parameters.push(['oauth_token', Global.authInfo.oauthToken]);
		message.parameters.push(['oauth_version', '1.0']);
		message.parameters.sort()
		OAuth.SignatureMethod.sign(message, accessor);
		var authHeader = OAuth.getAuthorizationHeader("", message.parameters);

		var headers = ["Authorization", authHeader];
		if (method == 'POST') {
			return http.post(fullUrl, JSON.stringify(params), headers, callbacks);
		} else {
			return http.get(fullUrl, '', headers, callbacks);
		}
	};

	this.upload = function(controller, urlChild, localUrl, callbacks) {
		var url = hostUrl + urlChild;
		var timestamp = OAuth.timestamp();
		var nonce = OAuth.nonce(20);
		var accessor = {
			consumerSecret: "b2734cdb56e00b01ca19d6931c6f9f30",
			tokenSecret: Global.authInfo.tokenSecret
		};
		var message = {
			method: 'POST',
			action: url,
			parameters: OAuth.decodeForm('')
		};
		message.parameters.push(['oauth_consumer_key', "15f0fd5931f17526873bf8959cbfef2a04dda2d84"]);
		message.parameters.push(['oauth_nonce', nonce]);
		message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
		message.parameters.push(['oauth_timestamp', timestamp]);
		message.parameters.push(['oauth_token', Global.authInfo.oauthToken]);
		message.parameters.push(['oauth_version', '1.0']);
		message.parameters.sort()
		OAuth.SignatureMethod.sign(message, accessor);
		var authHeader = OAuth.getAuthorizationHeader("", message.parameters);

		controller.serviceRequest('palm://com.palm.downloadmanager/', {
		//new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
			method: 'upload',
			parameters: {
				'fileName': localUrl,
				'fileLabel': 'media',
				'url': url,
				//'contentType': 'image/jpg',
				"postParameters": [],
				customHttpHeaders: ['HOST:' + Setting.api, 'Authorization:' + authHeader],
				"subscribe": true
			},
			onSuccess: function(resp) {
				Mojo.Log.warn(url + ' upload success: ' + localUrl);
				Mojo.Log.warn('upload success: ' + JSON.stringify(resp));
				if(callbacks.onSuccess) {
					callbacks.onSuccess(resp);
				}
			},
			onFailure: function(e) {
				Mojo.Log.error(localUrl + ' upload fail: ' + JSON.stringify(e));
				if(callbacks.onFailure) {
					callbacks.onFailure(e);
				}
			}
		});
	}
}

