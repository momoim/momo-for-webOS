var Verify = function() {};

Verify.prototype = {
    auth : function(mobile, zone_code, verify_code, onVerifySuccess, onVerifyFailure) {
        var postParams = {
            mobile: mobile,
            zone_code: zone_code,
            verifycode: verify_code
        };
        new interfaces.Momo().postRegisterVerify(postParams, {
            onSuccess: onVerifySuccess,
            onFailure: onVerifyFailure
        });
    },
    resend : function(mobile, zone_code, onResendSuccess, onResendFailure) {
        var postParams = {
            mobile: mobile,
            zone_code: zone_code
        };
        new interfaces.Momo().postResendVerifyCode(postParams, {
            onSuccess: onResendSuccess,
            onFailure: onResendFailure
        });
    }
}

function VerifyAssistant() {
    this.timer = 60;
    this.timerCount = 0;
}

VerifyAssistant.prototype = {
    setup: function() {
        var that = this;
        /*区号选择*/
        var country = CountryHelper.data();
        var tempCountry = [];
        for(var i = 0, len = country.length; i < len; i++){
            var tempObj = {label:$L(country[i][1] + "(+" + country[i][0] + ")" ), value: country[i][0]};
            tempCountry.push(tempObj);
        }
        this.selectorsModel = {currentStatus: Global['signupUser']['zone_code']};
        this.statuses =  tempCountry;
        this.controller.setupWidget('country-code',
           this.attributes = {
               label: '国家(区号)',
               labelPlacement: Mojo.Widget.labelPlacementRight,
               choices: this.statuses,
               modelProperty:'currentStatus'
           },
           this.model = this.selectorsModel);
        this.controller.listen('country-code', Mojo.Event.propertyChange, this.changed.bindAsEventListener(this));
        /*手机号输入框*/
        this.controller.setupWidget('mobile', {
            modelProperty: 'mobile',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: true 
        }, Global['signupUser']);
        /*验证码输入框*/
        this.controller.setupWidget('verify-code', {
            modelProperty: 'password',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: true,
            autoFocus: true
        }, Global['signupUser']);
        /*登录按钮*/
        this.controller.setupWidget('signup-login', 
            this.attributes = {
                type : Mojo.Widget.activityButton
            },
            this.model = {
                buttonLabel: $L('登录'),
                buttonClass: 'affirmative',
                disabled: false
            }
        );

        this.buttonSignLogin = this.controller.get('signup-login');
        this.controller.listen(this.controller.get('signup-login'), Mojo.Event.tap, this.onSignupLoginTapped.bind(this));
        /*重发验证码按钮*/
        this.controller.setupWidget('resend-verifycode', 
            this.attributes = {
                type : Mojo.Widget.activityButton
            },
            this.model = {
                buttonLabel: $L('重发验证码'),
                buttonClass: 'secondary',
                disabled: false
            }
        );

        this.buttonSignLogin = this.controller.get('resend-verifycode');
        this.controller.listen(this.controller.get('resend-verifycode'), Mojo.Event.tap, this.onResendVerifyCodeTapped.bind(this));

    },
    changed: function(propertyChangeEvent) {
        Global['signupUser']['zone_code'] = this.selectorsModel.currentStatus;
    },
    onSignupLoginTapped: function(tapEvent) {
        var that = this;
		Mojo.Log.info(this.TAG, 'onLoginTapped');
		if (!this.buttonSignLogin.spinning) {
			this.buttonSignLogin.mojo.activate();
			new Verify().auth(Global['signupUser']['mobile'], Global['signupUser']['zone_code'], Global['signupUser']['password'], that.onVerifySuccess.bind(that), that.onVerifyFailure.bind(that));
		}
    },
    onResendVerifyCodeTapped: function() {
        var _this = this;
        clearTimeout(_this.timerCount);
        Mojo.Log.warn('flag======>' + Global['signupUser']['get_verify_code_flag'])
        if(!Global['signupUser']['get_verify_code_flag']){
            _this.controller.get('resend-verifycode').mojo.activate();
            new Signup().auth(Global['signupUser']['mobile'], Global['signupUser']['zone_code'], _this.onResendSuccess.bind(_this), _this.onResendFailure.bind(_this));
        }else{
            NotifyHelper.instance().banner('请在' + _this.timer + '秒后再点击获取验证码');
        }
        (function timerFun(limitTime) {
            if(_this.timer == 0){
                Global['signupUser']['get_verify_code_flag'] = false;
                _this.timer = 60;
                clearTimeout(_this.timerCount);
                _this.controller.get('resend-verifycode').mojo.deactivate();
                Mojo.Log.warn('resend');
                return;
            }else{
                Global['signupUser']['get_verify_code_flag'] = true;
                _this.timer -= 1;
                _this.timerCount = setTimeout(function(){timerFun(_this.timer);}, 1000);
            }   
        })(_this.timer);
        //NotifyHelper.instance().banner(timerNum);
    },
    onVerifySuccess: function(resp) {
        var userObj = JSON.parse(resp.request.transport.responseText);
        Global['signupUser']['uid'] = userObj.uid;
        Global['signupUser']['user_status'] = userObj.user_status;
        Global['signupUser']['oauth_token'] = userObj.oauth_token;
        Global['signupUser']['oauth_token_secret'] = userObj.oauth_token_secret;
        Global['signupUser']['qname'] = userObj.qname;

        Global.authInfo = {
			user: {
				id: Global['signupUser']['uid'],
				name: Global['signupUser']['realname'],
				avatar: ''
			},
			oauthToken: Global['signupUser']['oauth_token'],
			tokenSecret: Global['signupUser']['oauth_token_secret'],
			queueName: Global['signupUser']['qname']
		};
        Mojo.Log.warn('uid2222 =========> ' + Global['signupUser']['uid']);
		this.controller.stageController.popScenesTo('login', {
            mobile : Global['signupUser']['mobile'],
            password : Global['signupUser']['password'],
            user_status : Global['signupUser']['user_status'],
            action: 'after-signup' 
        });
        //NotifyHelper.instance().banner("success");
    },
    onVerifyFailure: function(resp) {
        var tipArray = JSON.parse(resp.request.transport.responseText).error.split(':');
        var tip = tipArray[0];
        if(tipArray.length === 2){
            tip = tipArray[1];
        }
        NotifyHelper.instance().banner(tip);
    },
    onResendSuccess: function() {
		//this.controller.stageController.pushScene('verify');
        NotifyHelper.instance().banner("验证码已发送，请稍等");
    },
    onResendFailure: function(resp) {
        var tipArray = JSON.parse(resp.request.transport.responseText).error.split(':');
        var tip = tipArray[0];
        if(tipArray.length === 2){
            tip = tipArray[1];
        }
        NotifyHelper.instance().banner(tip);
    }
}
