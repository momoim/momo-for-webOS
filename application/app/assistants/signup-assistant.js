var Signup = function() {};

Signup.prototype = {
    
}

function SignupAssistant() {
    /*缓存注册人员信息*/
    this.modelUser = {
        code : 86,
        telephone : '',
        verify_code : ''
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
        this.controller.setupWidget('telephone', {
            hintText: $L('13800000000'),
            modelProperty: 'telephone',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: false
        }, this.modelUser);
        /*获取验证码按钮*/
        this.controller.setupWidget('get-verify-code', 
            this.attributes = {
                type : Mojo.Widget.activityButton
            },
            this.model = {
                buttonLabel: $L('获取验证码'),
                buttonClass: 'affirmative',
                disabled: false
            }
        );

        this.controller.listen(this.controller.get('get-verify-code'), Mojo.Event.tap, this.onGetVerifyCodeTapped.bind(this));

    },
    changed: function(propertyChangeEvent) {
        this.modelUser.code = this.selectorsModel.currentStatus;
        //NotifyHelper.instance().banner(this.controller.get('get-verify-code').getAttribute("id"));
        //Mojo.Log.info("The user's current status has changed to " + this.selectorsModel.currentStatus);
    },
    onGetVerifyCodeTapped: function(tapEvent) {
        //NotifyHelper.instance().banner("button");
        var _this = this;
        var flag = _this.flag.get_verify_code;
        var getVerifyCode = _this.controller.get('get-verify-code');
        /*setTimeout(function() {*/
                //Mojo.Log.warn(flag);
            //getVerifyCode.mojo.deactivate();
        /*}, 2000);*/
        Mojo.Log.warn("flag=====>" + (!flag));
        if(!flag){
            Mojo.Log.warn("flag222222>>>" + flag);
            _this.flag.get_verify_code = false;
            setTimeout(function() {
                getVerifyCode.mojo.deactivate();
                _this.flag.get_verify_code = true;
            }, 2000);
        }
        
        //this.controller.get('get-verify-code').getAttribute("disabled") = true;
    }
}
