var Global = {
	mainStage: 'mainStage',
	dashStage: 'dashboardStage',
	runningStage: 'runningStage',
	//是否有新未读，回到主列表跳转到第一条
	hasNewUnread: false,
	//正在转换的录音文件，用于转换完发送
	convertingAmrList: [],
	configs: {
		background: true,
		lastSwitcher: 'sound',
		alert: {
			sound: true
		}
	},
	pluginAble: function() {
		var version = Mojo.Environment.DeviceInfo.platformVersionMajor;
		//Mojo.Log.error('majon version of device: ' + version);
		//return (version < 2);
		return true;
	},
	backAble: function() {
		return Mojo.Environment.DeviceInfo.keyboardAvailable;
	},
	keepAuth: function() {
		function fail() {}
		function success(info) {
			Global.authInfo = info;
			if (!Global.pluginAble()) {
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "chatInit",
					parameters: Global.authInfo,
					onSuccess: function() {},
					onFailure: function(fail) {}
				});
			}
		};
		DBHelper.instance().get('authInfo', success, fail);
	},
	force: function() {
		function fail() {}
		function success(info) {
			Global.authInfo = info;

			if (Global.pluginAble()) {
				if (Global.AmrHelper && Global.AmrHelper.reconnectSocket) {
					Global.AmrHelper.reconnectSocket();
				}
			} else {
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "chatForce",
					parameters: Global.authInfo,
					onSuccess: function() {},
					onFailure: function(fail) {}
				});
			}
		};
		DBHelper.instance().get('authInfo', success, fail);
	},
	sendRogerInbox: function(who, which) {
		Mojo.Log.error('sending roger inbox: ' + which + ' who ' + who);
		var roger = {
			client_id: 7,
			sender: Global.authInfo.user.id,
			receiver: who,
			status: {
				msg_receive: {
					id: which
				}
			}
		};
		Global.sendRoger(roger);
	},
	sendRogerRead: function(which) {
		Mojo.Log.error('sending roger read: ' + which);
		if (Global.talking == null || Global.talking == '') return;
		var roger = {
			client_id: 7,
			sender: Global.authInfo.user.id,
			receiver: Global.talking,
			status: {
				msg_read: {
					id: which
				}
			}
		};
		Global.sendRoger(roger);
	},
	sendRoger: function(roger) {
		Mojo.Log.error('sending roger : ' + JSON.stringify(roger));
		var all = {
			kind: 'roger',
			data: roger
		};
		if (Global.pluginAble()) {
			ChatSender.instance().sendWithPlugin(all, roger.receiver);
		} else {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "chatSend",
				parameters: {
					auth: Global.authInfo,
					chat: all
				},
				onSuccess: function() {},
				onFailure: function(fail) {
					Global.keepAuth();
					//Mojo.Log.error('sending roger read fail try plugin');
				}
			});
		}
	},
	menu: function(controller) {
		//Menu
		var menuItems = [
		Mojo.Menu.editItem, {
			label: '后台运行',
			icon: Global.configs.background ? 'toggle-on': 'toggle-off',
			command: 'cmdToggleBackground'
		},
		{
			label: '声音提醒',
			icon: Global.alertSound() ? 'toggle-on': 'toggle-off',
			command: 'cmdToggleAlertSound'
		},
		{
			label: '关于momo',
			command: 'cmdAbout'
			//,template: 'templates/menu/about'
		},
		{
			label: '退出',
			command: 'cmdLogout'
		}];

		if(!Global.backAble()) {
			//add back to menu
			menuItems.splice(0, 0, {
				label: '后退',
				command: 'cmdBack'
			});
		}

		if (Global.menuModels) {
			Global.menuModels.items = menuItems;
		} else {
			Global.menuModels = {
				visible: true,
				items: menuItems
			};
		}
		controller.setupWidget(Mojo.Menu.appMenu, {
			omitDefaultItems: true
		},
		Global.menuModels);
	},
	alertSound: function() {
		if (Global.configs.alert && ! Global.configs.alert.sound) {
			return false;
		} else {
			return true;
		}
	},
	updateList: [],
	updateRegister: function(what) {
		Global.updateList.push(what);
	},
	updateUnRegister: function(what) {
		for (var i = 0; i < Global.updateList.length; ++i) {
			var scene = Global.updateList[i];
			if (scene == what) {
				Global.updateList.splice(i, 1);
				break;
			}
		}
		//whether there is not main stage
		//if has logined
		function fail() {}
		function success(info) {
			Mojo.Log.info('get auth info success');
			Global.authInfo = info;
			//that.setWakeup();
		};
		DBHelper.instance().get('authInfo', success, fail);
	},
	update: function(income) {
		for (var now in Global.updateList) {
			var scene = Global.updateList[now];
			if (scene && scene.update) {
				scene.update(income);
			}
		}
	},
	refreshMenus: function() {
		//toggle background
		for (var i = 0; i < Global.updateList.length; ++i) {
			var scene = Global.updateList[i];
			if (scene && scene.controller) {
				Global.menu(scene.controller);
			}
		}
	},
	toggleBackground: function() {
		Global.configs.background = ! (Global.configs.background);

		DBHelper.instance().add('configs', Global.configs);
		Global.refreshMenus();
	},
	toggleAlertSound: function() {
		Global.configs.alert = {
			sound: ! (Global.alertSound())
		};

		DBHelper.instance().add('configs', Global.configs);
		Global.refreshMenus();
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

		DBHelper.instance().get('configs', function(s) {
			Global.configs = s;
		},
		function() {
			DBHelper.instance().add('configs', Global.configs);
		});
	},
	clearBackground: function() {
		var stageName = Global.runningStage;
		this.clearNotify(stageName);
	},
	clearMsg: function() {
		var stageName = Global.dashStage;
		this.clearNotify(stageName);
	},
	clearNotify: function(stageName) {
		var appController = Mojo.Controller.getAppController();
		appController.closeStage(stageName);
	},
	handleLaunch: function(launchParams) {
		//Mojo.Log.error('handleLaunch: ' + JSON.stringify(launchParams));
		var that = this;
		var cardStageController = this.controller.getStageController(Global.mainStage);
		var appController = Mojo.Controller.getAppController();
		if (!launchParams || launchParams.action === 'onDashClick') {
			//Mojo.Log.error('no launch params');
			var pushMainScene = function(stageController) {
				function fail() {
					if (!Global.logining) {
						stageController.pushScene('login');
					}
				}
				function success(info) {
					Mojo.Log.info('get auth info success');
					Global.authInfo = info;
					stageController.pushScene('main', {
						which: launchParams.data
					});
					//stageController.pushScene('recorder');
				};
				that.clearBackground();
				that.clearMsg();
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
				cardStageController.delegateToSceneAssistant('switchInto', launchParams.data);
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
				if (cardStageController) {
					this.onKeepAlive();
					//Mojo.Log.error('has stage keep alive');
				} else {
					DBHelper.instance().get('configs', function(c) {
						Global.configs = c;
						if (Global.configs.background) {
							that.onKeepAlive();
							//Mojo.Log.error('backgournd keep alive');
						} else {
							Mojo.Log.error('not backgournd dunt keep alive');
						}
					},
					function() {});
				}
				break;
			case 'onMsgSendError':
				that.onMsgSendError(launchParams);
				break;
			case 'onChatToSend':
				that.onChatToSend(launchParams);
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
		if (Global.pluginAble()) {
			return;
		}
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
	onChatToSend: function(launchParams) {
		var that = this;
		Mojo.Log.error('on chat prepare from service');
		ChatSender.instance().sendChat(JSON.parse(launchParams.data));
	},
	onMsgSendError: function(launchParams) {
		var that = this;
		Mojo.Log.error('on msg send error trying to send with http');
		new interfaces.Momo().postSendMessage(JSON.parse(launchParams.data).data, {
			onSuccess: function(resp) {
				//Mojo.Log.error('on msg send error trying to send with http success');// + resp.responseText);
				var c = resp.responseJSON;
				if (c) {
					if (! (c.kind)) {
						c = {
							kind: 'im',
							data: c
						};
					}
					that.onNewIncome(JSON.stringify(c));
				}
			},
			onFailure: function(e) {
				Mojo.Log.error('on msg send error trying to send with http fail' + JSON.stringify(e));
				NotifyHelper.instance().banner('msg send fail');
			}
		});
	},
	onNewIncome: function(messageStr) {
		var that = this;
		var message = JSON.parse(messageStr);
		var income = message.data;
		if (!income.other) {
			income.other = (income.sender.id == Global.authInfo.user.id ? income.receiver[0] : income.sender);
		}
		if (!message || message.kind != 'sms') {
			return;
		}
		//Mojo.Log.error('onNewIncome================:' + messageStr);
		var uid = Global.authInfo.user.id;
		var isOut = (uid == income.sender.id);
		if(isOut) {
			if(income.state !== RabbitDB.state.sending || income.hasOwnProperty('timestamp')) {
				income.state = RabbitDB.state.sent;
				//Mojo.Log.error('onNewIncome================: not sending');
			} else {
				//Mojo.Log.error('onNewIncome================: sending' + income.timestamp);
			}
		} else {
			income.state = RabbitDB.state.income;
		}
		// store to database
		RabbitDB.instance().addTalk(income);
		if (isOut && income.state == RabbitDB.state.sent) {
			ChatSender.instance().removeSendingChat(message);
		}

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
			if (income.sender.id != Global.authInfo.user.id) {
				Global.sendRogerInbox(income.sender.id, income.id);
			}
		} else {
			//TODO string compare?
			if (income.sender.id != Global.authInfo.user.id) {
				Global.sendRogerRead(income.id);
			}
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
			DBHelper.instance().remove('config');
			stage.pushScene('login');
		} else if (event.command === 'cmdAbout') {
			stage.pushScene('about');
		} else if (event.command === 'cmdToggleBackground') {
			Global.toggleBackground();
		} else if (event.command === 'cmdToggleAlertSound') {
			Global.toggleAlertSound();
		} else if (event.command === 'cmdBack') {
			//why this dunt work?
			//var backEvent = Mojo.Event.make(Mojo.Event.back);
			//stage.sendEventToCommanders(backEvent);

			//and i try this
			if(stage.getScenes().length > 0 && stage.activeScene() != stage.getScenes()[0]) {
				stage.popScene();
			} else {
				//and why this not work too? what the fuck
				stage.deactivate();
			}
		}
	}
};

