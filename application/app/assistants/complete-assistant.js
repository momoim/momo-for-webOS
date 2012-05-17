var Complete = function() {};

Complete.prototype = {
    auth : function(name, password, onSubmitSuccess, onSubmitFailure) {
        var postParams = {
            realname: name,
            password: password
        };
        new interfaces.Momo().postUserPersonal(postParams, {
            onSuccess: onSubmitSuccess,
            onFailure: onSubmitFailure
        });
    }
}

function CompleteAssistant() {
    this.modelUser = {
        realname : '',
        password : ''
    }
}

CompleteAssistant.prototype = {
    setup: function() {
        var that = this;
        this.controller.get('complete-title').innerHTML = $L(StringMap.complete.title);
        this.controller.get('complete-name').innerHTML = $L(StringMap.complete.name);
        this.controller.get('complete-password').innerHTML = $L(StringMap.complete.password);
        this.controller.get('complete-password-sure').innerHTML = $L(StringMap.complete.passwordSure);
        /*姓名输入框*/
        this.controller.setupWidget('name', {
            modelProperty: 'realname',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits:  false,
            autoFocus: true
        }, this.modelUser);
        /*密码输入框*/
        this.controller.setupWidget('password', {
            modelProperty: 'password',
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: false,
        }, this.modelUser);
        /*确认密码输入框*/
        this.controller.setupWidget('password-ensure', {
            textCase: Mojo.Widget.steModeLowerCase,
            enterSubmits: false,
        });
        /*登录按钮*/
        this.controller.setupWidget('submit', 
            this.attributes = {
                type : Mojo.Widget.activityButton
            },
            this.model = {
                buttonLabel: $L('完成'),
                buttonClass: 'affirmative',
                disabled: false
            }
        );

        this.buttonSubmit = this.controller.get('submit');
        this.controller.listen(this.controller.get('submit'), Mojo.Event.tap, this.onSubmitTapped.bind(this));
    },
    onSubmitTapped: function(tapEvent) {
        var _this = this;
        if(_this.controller.get('name').mojo.getValue() == ''){
            NotifyHelper.instance().banner('姓名不能为空');
            _this.buttonSubmit.mojo.deactivate();
            return;
        }
        if(_this.controller.get('password-ensure').mojo.getValue() == ''){
            NotifyHelper.instance().banner('确认密码不能为空');
            _this.buttonSubmit.mojo.deactivate();
            return;
        }
        if(_this.controller.get('password').mojo.getValue() != _this.controller.get('password-ensure').mojo.getValue()){
            NotifyHelper.instance().banner('两次密码输入不一致');
            _this.buttonSubmit.mojo.deactivate();
            return;
        }
		if (!this.buttonSubmit.spinning) {
			this.buttonSubmit.mojo.activate();
			new Complete().auth(this.modelUser.realname, this.modelUser.password, _this.onSubmitSuccess.bind(_this), _this.onSubmitFailure.bind(_this));
		}
    },
    onSubmitSuccess: function(resp) {
        var _this = this;
        Global.authInfo.user.name = this.modelUser.realname;
        Global.authInfo.user.status = JSON.parse(resp.request.transport.responseText).user_status;
        DBHelper.instance().add('authInfo', Global.authInfo);
        _this.controller.stageController.swapScene('main');
    },
    onSubmitFailure: function(resp) {
        var tipArray = JSON.parse(resp.request.transport.responseText).error.split(':');
        var tip = tipArray[0];
        if(tipArray.length === 2){
            tip = tipArray[1];
        }
        NotifyHelper.instance().banner(tip);
        //Mojo.Log.warn('resp: ' + JSON.stringify(resp));
    }
}
