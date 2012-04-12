var Global = {
	mainStage: 'mainStage',
	dashStage: 'dashboardStage',
	hasNewUnread: false,
	//是否有新未读，回到主列表跳转到第一条
	lastSwitcher: 'sound',
	//正在转换的录音文件，用于转换完发送
	convertingAmrList: [],
	keepAuth: function() {
		function fail() {}
		function success(info) {
			Global.authInfo = info;
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "chatInit",
				parameters: Global.authInfo,
				onSuccess: function() {},
				onFailure: function(fail) {}
			});
		};
		DBHelper.instance().get('authInfo', success, fail);
	},
	sendRoger: function() {
		if (Global.talking == null || Global.talking == '') return;
		var roger = {
			client_id: 7,
			sender: Global.authInfo.user.id,
			receiver: Global.talking,
			status: {
				msg_read: {}
			}
		};
		new Mojo.Service.Request("palm://momo.im.app.service.node/", {
			method: "chatSend",
			parameters: {
				auth: Global.authInfo,
				chat: {
					kind: 'roger',
					data: roger
				}
			},
			onSuccess: function() {},
			onFailure: function(fail) {
				Global.keepAuth();
			}
		});
	},
	menu: function(controller) {
		//Menu
		var menuItems = [
		Mojo.Menu.editItem
		
		, {
			label: '关于momo',
			command: 'cmdAbout'
		}
		, {
			label: '退出',
			command: 'cmdLogout'
		}
		];

		controller.setupWidget(Mojo.Menu.appMenu, {
			omitDefaultItems: true
		},
		{
			visible: true,
			items: menuItems
		});
	},
	updateList: [],
	updateRegister: function(what) {
		Global.updateList.push(what);
	},
	updateUnRegister: function(what) {
		for(var i = 0 ; i < Global.updateList.length; ++i) {
			var scene = Global.updateList[i];
			if(scene == what) {
				Global.updateList.splice(i, 1);
				break;
			}
		}
	},
	update: function(income) {
		for(var now in Global.updateList) {
			var scene = Global.updateList[now];
			if(scene && scene.update) {
				scene.update(income);
			}
		}
	}
};

function AppAssistant() {};

AppAssistant.prototype = {
	setup: function() {
		Mojo.Log.info('on app assistant setup');
		var that = this;
		//DBHelper.instance().remove('authInfo');
		function fail() {}
		function success(info) {
			Mojo.Log.info('get auth info success');
			Global.authInfo = info;
			that.onKeepAlive();
			//that.setWakeup();
		};
		DBHelper.instance().get('authInfo', success, fail);
		DBHelper.instance().get('lastSwitcher', function(s) {
			Global.lastSwitcher = s;
		},
		function() {});
	},
	handleLaunch: function(launchParams) {
		Mojo.Log.info('handleLaunch');
		var that = this;
		var cardStageController = this.controller.getStageController(Global.mainStage);
		var appController = Mojo.Controller.getAppController();
		if (!launchParams) {
			//
			Mojo.Log.info('no launch params');
			var pushMainScene = function(stageController) {
				function fail() {
					if (!Global.logining) {
						stageController.pushScene('login');
					}
				}
				function success(info) {
					Mojo.Log.info('get auth info success');
					Global.authInfo = info;
					stageController.pushScene('main');
					//stageController.pushScene('recorder');
				};
				DBHelper.instance().get('authInfo', success, fail);
			};
			//Mojo.Log.error("Create Main Stage");                                                                                   
			var stageArguments = {
				name: Global.mainStage,
				lightweight: true
			};

			if (!cardStageController) {
				this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
			}
			else {
				cardStageController.activate();
			}
		}
		else {
			//Mojo.Log.info('launch' + launchParams.action);
			switch (launchParams.action) {
				//check if there's new msg
			case 'onUnreadList':
				this.onUnreadList(launchParams.data);
				break;
			case 'onNewIncome':
				this.onNewIncome(launchParams.data);
				break;
			case 'keep-alive':
				this.onKeepAlive();
				break;
			case 'onMsgSendError':
				Mojo.Log.warn('on msg send error trying to send with http');
				new interfaces.Momo().postSendMessage(JSON.parse(launchParams.data).data, {
					onSuccess: function(resp) {
						Mojo.Log.warn('on msg send error trying to send with http success');
						that.onNewIncome({
							kind: 'im',
							data: resp.responseJSON
						});
					},
					onFailure: function() {
						Mojo.Log.warn('on msg send error trying to send with http fail');
					}
				});
				break;
			case 'onConnError':
				Mojo.Log.info('onConnError: ' + launchParams.data);
				//NotifyHelper.instance().banner(launchParams.data);
				break;
			default:
				Mojo.Log.info('unknown launch params');
				break;
			}
		}
	},
	onKeepAlive: function() {
		//Mojo.Log.info('keeping alive');
		var that = this;

		new Mojo.Service.Request("palm://momo.im.app.service.node/", {
			method: "keepAlive",
			parameters: {
				subscribe: true,
				resubscribe: true
			},
			onSuccess: function() {},
			onFailure: function(fail) {}
		});

		Global.keepAuth();
		this.setWakeup();
	},
	setWakeup: function(interval) {
		if (interval == null) {
			interval = "00:05:00";
		}
		//Mojo.Log.info('setWakeup ing');
		var that = this;
		this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
			method: "set",
			parameters: {
				"key": "momo.im.app.update",
				"in": interval,
				"wakeup": true,
				"uri": "palm://com.palm.applicationManager/open",
				"params": {
					"id": Mojo.appInfo.id,
					"params": {
						"action": "keep-alive"
					}
				}
			},
			onSuccess: function(response) {},
			onFailure: function(response) {}
		});
	},
	onUnreadList: function(data) {
		Mojo.Log.info('onUnread================:' + data);
		var list = JSON.parse(data);
		for (var i = 0; i < list.length; ++i) {
			RabbitDB.instance().addTalk(list[i]);
		}

		if (list && list.length > 0) {
			var appController = Mojo.Controller.getAppController();
			var mainStage = appController.getStageProxy(Global.mainStage);

			if (mainStage) {
				mainStage.delegateToSceneAssistant('refreshDataFromDB');
			}
		}
	},
	onNewIncome: function(messageStr) {
		var message = JSON.parse(messageStr);
		var income = message.data;
		if (!income.other) {
			income.other = (income.sender.id == Global.authInfo.user.id ? income.receiver[0] : income.sender);
		}
		if (!message || message.kind != 'sms') {
			return;
		}
		Mojo.Log.info('onNewIncome================:' + messageStr);
		// store to database
		RabbitDB.instance().addTalk(income);

		//notify
		var appController = Mojo.Controller.getAppController();
		var mainStage = appController.getStageProxy(Global.mainStage);
		if (income.sender.id != Global.authInfo.user.id && (!mainStage || (Global.talking != income.other.id))) {
			if (!mainStage) {
				var stageName = Global.dashStage;

				var dashboardController = appController.getStageController(stageName);

				if (dashboardController) {
					dashboardController.delegateToSceneAssistant('update', income);
				}
				else {
					var f = function(stageController) {
						stageController.indicateNewContent(true);
						stageController.pushScene('dashboard', income);
					};

					appController.createStageWithCallback({
						name: stageName,
						lightweight: true
					},
					f, 'dashboard');
				}
			} else {
				NotifyHelper.instance().bannerNewMsg();
				//NotifyHelper.instance().banner(income.sender.name + ': ' + AppFormatter.content(income.content));
			}

			Global.hasNewUnread = true;
		} else {
			Global.sendRoger();
		}
		//NotifyHelper.instance().banner('got meesage main: ' + JSON.stringify(income.content));
		if (mainStage) {
			//mainStage.delegateToSceneAssistant('update', income);
			Global.update(income);
		}
	},
	handleCommand: function(event) {
		var stage = this.controller.getActiveStageController();
		if (event.command === 'cmdLogout') {
			DBHelper.instance().remove('authInfo');
			stage.pushScene('login');
		} else if(event.command === 'cmdAbout') {
			this.controller.getActiveStageController().pushAppSupportInfoScene();
		}
        if (event.command === 'cmdAbout') {
			stage.pushScene('about');
		}
	}
};

