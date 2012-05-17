var Login = function() {
};

Login.prototype = {
	auth: function(zone_code, mobile, password, onLoginSuccess, onLoginFailure) {
		if (Global.deviceID == null) {
            NotifyHelper.instance().banner($L(StringMap.log.deviceIDFailed));
			return;
		}
		var postParams = {
            zone_code: zone_code,
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
        this.controller.get('account').innerHTML = $L(StringMap.login.account);
        this.controller.get('login-username-label').innerHTML = $L(StringMap.login.loginUsernameLabel);
        this.controller.get('password').innerHTML = $L(StringMap.login.password);

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
            zone_code: 86,
			username: '',
			password: '',
			disabled: false
		};
        /*区号选择*/
        var country = CountryHelper.data();
        var tempCountry = [];
        for(var i = 0, len = country.length; i < len; i++){
            var tempObj = {label:$L(country[i][1] + "(+" + country[i][0] + ")" ), value: country[i][0]};
            tempCountry.push(tempObj);
        }
        this.selectorsModel = {currentStatus: '86'};
        this.statuses =  tempCountry;
        this.controller.setupWidget('country-code',
           this.attributes = {
               label: $L(StringMap.login.areaCode),
               labelPlacement: Mojo.Widget.labelPlacementRight,
               choices: this.statuses,
               modelProperty:'currentStatus'
           },
           this.model = this.selectorsModel);
        this.controller.listen('country-code', Mojo.Event.propertyChange, this.changed.bindAsEventListener(this));

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
			hintText: $L(StringMap.login.password),
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
			buttonLabel: $L(StringMap.login.login),
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
			buttonLabel: $L(StringMap.login.register),
			buttonClass: 'secondary',
			disabled: false
		});

		this.buttonSignup = this.controller.get('signup');
		this.onSignupHandler = this.onSignup.bind(this);
		this.controller.listen("signup", Mojo.Event.tap, this.onSignupHandler);

		this.controller.document.addEventListener("keyup", this.keyUpHandler.bind(this), true);
		Mojo.Log.info(this.TAG, 'setup end');

	},
    changed: function(propertyChangeEvent) {
        this.modelUser.zone_code = this.selectorsModel.currentStatus;
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
				avatar: response.avatar,
                status: response.status
			},
			oauthToken: response.oauth_token,
			tokenSecret: response.oauth_token_secret,
			queueName: response.qname
		};

		//store to db
		Mojo.Log.info('store authInfo to db');
		DBHelper.instance().add('authInfo', Global.authInfo);

        if(Global.authInfo.user.status < 3){
		    this.controller.stageController.popScene('login');
		    this.controller.stageController.pushScene('complete');
            return false;
        }
		//switch to main assistant
		Mojo.Log.info('swap to main view');
		that.controller.stageController.swapScene('main');
	},
	onLoginFailure: function(resp) {
		var tipArray = JSON.parse(resp.request.transport.responseText).error.split(':');
        var tip = tipArray[0];
        if(tipArray.length === 2){
            tip = tipArray[1];
        }
        NotifyHelper.instance().banner(tip);
	},
	onLoginTapped: function() {
		var that = this;
		Mojo.Log.info(this.TAG, 'onLoginTapped');
		if (!this.buttonSignin.spinning) {
			this.buttonSignin.mojo.activate();
			new Login().auth(this.modelUser.zone_code, this.modelUser.username, this.modelUser.password, that.onLoginSuccess.bind(that), that.onLoginFailure.bind(that));
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
        this.buttonSignup.mojo.deactivate();
		this.controller.stageController.pushScene('signup');
	},
	activate: function(event) {
        if(event && event.action == 'after-signup'){
            this.modelUser.username = event.mobile;
            this.modelUser.password = event.password;
            Mojo.Log.warn('modelUser===>' + JSON.stringify(event));
            this.buttonSignin.spinning = false;
            this.onLoginTapped();
        }
    },
	deactivate: function(event) {},
	cleanup: function(event) {
		Global.logining = false;
		Mojo.Log.info(this.TAG, 'cleanup');
		this.controller.stopListening("signin", Mojo.Event.tap, this.onSigninHandler);
		this.controller.stopListening("signup", Mojo.Event.tap, this.onSignupHandler);
		this.controller.document.removeEventListener("keyup", this.keyUpHandler);
	}
}

