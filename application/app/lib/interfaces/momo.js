interfaces.Momo = function() {
	var http = new net.Http();
	var hostUrl = Setting.api;

	// 登陆
	this.postUserLogin = function(user, callbacks) {
		return http.post(hostUrl + '/user/login.json', JSON.stringify(user), '', callbacks);
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
		return this.post('/register/create.json', user, callbacks);
	}

	this.postPhotoUpload = function(file, callbacks) {
		return this.upload('/photo/upload.json', file, callbacks);
	};

	this.postFileUpload = function(file, callbacks) {
		return this.upload('/file/upload.json', file, callbacks);
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

	this.upload = function(urlChild, localUrl, callbacks) {
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

		new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
			method: 'upload',
			parameters: {
				'fileName': localUrl,
				'fileLabel': 'media',
				'url': url,
				//'contentType': 'image/jpg',
				"postParameters": [],
				customHttpHeaders: ['HOST:' + hostUrl, 'Authorization:' + authHeader],
				"subscribe": true
			},
			onSuccess: function(resp) {
				if(callbacks.onSuccess) {
					callbacks.onSuccess(resp);
				}
			},
			onFailure: function(e) {
				if(callbacks.onFailure) {
					callbacks.onFailure(e);
				}
			}.bind(this)
		});
	}
}

