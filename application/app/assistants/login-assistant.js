var Login = function() {};

Login.prototype = {
	auth: function(mobile, password, onLoginSuccess, onLoginFailure) {
		if (Global.deviceID == null) {
			NotifyHelper.instance().banner('获取设备ID失败');
			return;
		}
		var postParams = {
			mobile: mobile,
			password: password,
			device_id: Global.deviceID,
			client_id: 7
		};
		new interfaces.Momo().postUserLogin(postParams, {
			onSuccess: onLoginSuccess,
			onFailure: onLoginFailure
		});
	}
}

function LoginAssistant() {}

LoginAssistant.prototype = {
	setup: function() {
		Global.logining = true;
		var that = this;

		Mojo.Log.info(this.TAG, "onSetup");

		new Mojo.Service.Request('palm://com.palm.preferences/systemProperties', {
			method: "Get",
			parameters: {
				"key": "com.palm.properties.nduid"
			},
			onSuccess: function(response) {
				Global.deviceID = response['com.palm.properties.nduid'];
			}
		});

		this.modelUser = {
			username: '',
			password: '',
			disabled: false
		};

		this.controller.setupWidget('login-username', {
			hintText: $L("13800000000"),
			modelProperty: 'username',
			//autoFocus: true,
			//limitResize: true,
			//autoReplace: false,
			textCase: Mojo.Widget.steModeLowerCase,
			enterSubmits: false
		},
		this.modelUser);

		this.controller.setupWidget('login-password', {
			hintText: $L("输入密码"),
			modelProperty: 'password'
			//limitResize: true,
			//autoReplace: false
			//textCase: Mojo.Widget.steModeLowerCase,
			//enterSubmits: true
		},
		this.modelUser);

		this.controller.setupWidget('signin', {
			type: Mojo.Widget.activityButton
		},
		this.modelSignin = {
			buttonLabel: $L("登陆"),
			buttonClass: 'affirmative',
			disabled: false
		});

		this.buttonSignin = this.controller.get('signin');
		this.onSigninHandler = this.onLoginTapped.bind(this);
		this.controller.listen("signin", Mojo.Event.tap, this.onSigninHandler);

		this.responseArea = this.controller.get('response');

		this.controller.setupWidget('signup', {
			type: Mojo.Widget.activityButton
		},
		{
			buttonLabel: $L("注册帐号"),
			buttonClass: 'negative',
			disabled: false
		});

		this.buttonSignup = this.controller.get('signup');
		this.onSignupHandler = this.onSignup.bind(this);
		this.controller.listen("signup", Mojo.Event.tap, this.onSignupHandler);

		this.controller.document.addEventListener("keyup", this.keyUpHandler.bind(this), true);
		Mojo.Log.info(this.TAG, 'setup end');

	},
	onLoginSuccess: function(data) {
		var that = this;
		Mojo.Log.info('onSuccess.......text:' + data.responseText);
		var response = data.responseJSON;
		Mojo.Log.info('onSuccess.......', JSON.stringify(response));

		Global.authInfo = {
			user: {
				id: response.uid,
				name: response.name,
				avatar: response.avatar
			},
			oauthToken: response.oauth_token,
			tokenSecret: response.oauth_token_secret,
			queueName: response.qname
		};

		//store to db
		Mojo.Log.info('store authInfo to db');
		DBHelper.instance().add('authInfo', Global.authInfo);

		//switch to main assistant
		Mojo.Log.info('swap to main view');
		that.controller.stageController.swapScene('main');
	},
	onLoginFailure: function(resp) {
		NotifyHelper.instance().banner(JSON.stringify(resp));
		// body...
	},
	onLoginTapped: function() {
		var that = this;
		Mojo.Log.info(this.TAG, 'onLoginTapped');
		if (!this.buttonSignin.spinning) {
			this.buttonSignin.mojo.activate();
			new Login().auth(this.modelUser.username, this.modelUser.password, that.onLoginSuccess.bind(that), that.onLoginFailure.bind(that));
		}
	},
	keyUpHandler: function(event) {
		if (Mojo.Char.isEnterKey(event.keyCode)) {
			if (event.srcElement.parentElement.id == "login-password") {
				//this.controller.get('username').mojo.blur();
				//this.onLoginTapped.bind(this)();
				setTimeout(this.onLoginTapped.bind(this), 10);
			}
		}
	},
	onSignup: function() {
		//this.buttonSignup.mojo.deactivate();
		this.controller.stageController.pushScene('signup');
	},
	activate: function(event) {},
	deactivate: function(event) {},
	cleanup: function(event) {
		Global.logining = false;
		Mojo.Log.info(this.TAG, 'cleanup');
		this.controller.stopListening("signin", Mojo.Event.tap, this.onSigninHandler);
		this.controller.stopListening("signup", Mojo.Event.tap, this.onSignupHandler);
		this.controller.document.removeEventListener("keyup", this.keyUpHandler);
	}
}

