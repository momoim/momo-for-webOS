var Signup = function() {};

Signup.prototype = {
    auth : function(mobile, zone_code, onSignupSuccess, onSignupFailure) {
        if(Global.deviceID === null){
            NotifyHelper.instance().banner('获取设备ID失败');
            return;
        }
        var postParams = {
            mobile: mobile,
            zone_code: zone_code,
            device_id: Global.deviceID,
            source: 7
        };
        new interfaces.Momo().postRegisterCreate(postParams, {
            onSuccess: onSignupSuccess,
            onFailure: onSignupFailure
        });
    }
}

function SignupAssistant() {
    /*缓存注册人员信息*/
    this.modelUser = {
        zone_code : 86,
        mobile : ''
    };
    this.flag = {
        get_verify_code : false
    };
}

SignupAssistant.prototype = {
    setup: function() {
        var that = this;
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
               label: '国家(区号)',
               labelPlacement: Mojo.Widget.labelPlacementRight,
               choices: this.statuses,
               modelProperty:'currentStatus'
           },
           this.model = this.selectorsModel);
        this.controller.listen('country-code', Mojo.Event.propertyChange, this.changed.bindAsEventListener(this));
        /*手机号输入框*/
        this.controller.setupWidget('mobile', {
            hintText: $L('13800000000'),
            modelProperty: 'mobile',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: false
        }, this.modelUser);
        /*获取验证码按钮*/
        this.controller.setupWidget('get-verify-code', 
            this.attributes = {
                type : Mojo.Widget.activityButton
            },
            this.model = {
                buttonLabel: $L('注册并获取密码'),
                buttonClass: 'affirmative',
                disabled: false
            }
        );

        this.buttonGetVerifyCode = this.controller.get('get-verify-code');
        this.controller.listen(this.controller.get('get-verify-code'), Mojo.Event.tap, this.onGetVerifyCodeTapped.bind(this));

    },
    changed: function(propertyChangeEvent) {
        this.modelUser.zone_code = this.selectorsModel.currentStatus;
        //NotifyHelper.instance().banner(this.controller.get('get-verify-code').getAttribute("id"));
        //Mojo.Log.info("The user's current status has changed to " + this.selectorsModel.currentStatus);
    },
    onGetVerifyCodeTapped: function(tapEvent) {
        var that = this;
		Mojo.Log.info(this.TAG, 'onLoginTapped');
		if (!this.buttonGetVerifyCode.spinning) {
			this.buttonGetVerifyCode.mojo.activate();
			new Signup().auth(this.modelUser.mobile, this.modelUser.zone_code, that.onSignupSuccess.bind(that), that.onSignupFailure.bind(that));
		}
    },
    onSignupSuccess: function() {
		this.controller.stageController.pushScene('verify');
    },
    onSignupFailure: function(resp) {
		NotifyHelper.instance().banner(JSON.stringify(resp));
    }
}
