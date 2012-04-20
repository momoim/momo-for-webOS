var MainAssistant = Class.create({
	initialize: function() {
		Global.updateRegister(this);
	},
	setup: function() {
		var that = this;

		//for reupload
		ChatSender.instance().setController(this.controller);
		Global.menu(this.controller);
		//init ui
		that.idList = 'conv-list';

		that.controller.setupWidget(that.idList, {
			swipeToDelete: true,
			itemTemplate: 'templates/chat-conv-list-item',
			listTemplate: 'templates/chat-conv-list',
			//dividerTemplate: 'templates/photo-list-divider',
			addItemLabel: "发起新的对话",
			formatters: {
				content: AppFormatter.content.bind(that),
				timestamp: AppFormatter.time.bind(that)
			},
			uniquenessProperty: 'id',
			fixedHeightItems: false,
			hasNoWidgets: true
		},
		that.modelList = new ConvAdapter());
		that.list = that.controller.get(that.idList);

		Mojo.Event.listen(this.list, Mojo.Event.listTap, this.listWasTapped.bind(this));
		Mojo.Event.listen(this.list, Mojo.Event.listDelete, this.itemDelete.bind(this));
		Mojo.Event.listen(this.list, Mojo.Event.listAdd, this.itemAdd.bind(this));
		Mojo.Event.listen(this.list, Mojo.Event.dragStart, this.dragStart.bind(this));

		//start service
		that.controller.serviceRequest("palm://momo.im.app.service.node/", {
			method: "chatInit",
			parameters: Global.authInfo,
			onSuccess: that.onInitSuccess.bind(that),
			onFailure: function(fail) {}
		});

		this.onClickReal = this.onClick.bind(this);

		//amr辅助PDK类
		this.createPluginAmr(this.controller.window.document);
		Global.AmrHelper = this.controller.get('amr_helper');
		if (Global.AmrHelper) {
			Global.AmrHelper.ready = function() {
				//NotifyHelper.instance().banner('well');
				Global.AmrHelper.isReady = true;
			}.bind(this);
			//this.initializePlugin();
		} else {
			NotifyHelper.instance().banner('fail to load amr helper');
		}
	},
	initializePlugin: function() {
		var that = this;
		if (!Global.AmrHelper.foo) {
			setTimeout(that.initializePlugin.bind(that), 50);
		} else {
			// plug-in is ready to be used
			/*
			var foo = Global.AmrHelper.foo();
			NotifyHelper.instance().banner(foo);
			*/
			//Global.AmrHelper.wave2amr("/media/internal/.momo/audio/74eaa851-db2c-03fe-fed1-15f9a2df49dc.amr", "/media/internal/.momo/testmojo.amr");
			var auth = {
				"login_type": "token",
				"data": {
					"token": Global.authInfo.oauthToken
				},
				"heartbeat": 60,
				//TODO "compress": "gzip",
				"version": "1.1.1"
			};
			Global.AmrHelper.openSocket('58.22.103.41', 9191, JSON.stringify(auth));
			//Global.AmrHelper.openSocket('proxy.momo.im', 9191, JSON.stringify(auth));
		}
	},
	createPluginAmr: function(document) {
		var pluginObj = document.createElement("object");

		pluginObj.id = "amr_helper";
		pluginObj.type = "application/x-palm-remote";
		pluginObj.width = 2;
		pluginObj.height = 2;
		pluginObj['x-palm-pass-event'] = true;

		var param1 = document.createElement("param");
		param1.name = "appid";
		param1.value = Mojo.Controller.appInfo.id;

		var param2 = document.createElement("param");
		param2.name = "exe";
		param2.value = "amr_helper";

		pluginObj.appendChild(param1);
		pluginObj.appendChild(param2);

		document.body.appendChild(pluginObj);
	},
	onInitSuccess: function(result) {
		var that = this;
		that.controller.modelChanged(that.modelList);
	},
	dragStart: function(event) {
		if (Math.abs(event.filteredDistance.x) > Math.abs(event.filteredDistance.y) * 2) {
			var node = event.target.up(".palm-row");
			Mojo.Drag.setupDropContainer(node, this);

			node._dragObj = Mojo.Drag.startDragging(this.controller, node, event.down, {
				preventVertical: true,
				draggingClass: "palm-delete-element",
				preventDropReset: false
			});

			event.stop();
		}
	},
	listWasTapped: function(event) {
		Mojo.Log.info('listWasTapped');
		this.controller.stageController.pushScene('conv-detail', {
			item: event.item.other
		});
	},
	itemDelete: function(event) {
		RabbitDB.instance().deleteConv(event.item.other.id);
	},
	itemAdd: function(event) {
		this.controller.stageController.pushScene({
			appId: "com.palm.app.contacts",
			name: "list"
		},
		{
			mode: "picker",
			message: "找个有号码的人好吗？"
		});
	},
	update: function(message) {
		var that = this;
		that.modelList.addItem(message);
		that.controller.modelChanged(that.modelList);
		that.list.mojo.revealItem(0, true);
	},
	refreshClick: function(event) {
		var that = this;
		var loading = this.controller.document.getElementById('loading');
		Mojo.Log.info('refreshClick: trying to refresh unread');
		loading.className = "show";
		new interfaces.Momo().getIMAll({
			onSuccess: function(response) {
				Mojo.Log.info('refreshClick: trying to refresh unread: ' + response.responseText);
				new Mojo.Service.Request("palm://com.palm.applicationManager", {
					method: "launch",
					parameters: {
						id: Mojo.appInfo.id,
						params: {
							"action": "onUnreadList",
							"data": response.responseText
						}
					},
					onSuccess: function(response) {},
					onFailure: function(response) {}
				});
				loading.className = "ignore";
			}.bind(that),
			onFailure: function(response) {
				Mojo.Log.info('refreshClick: trying to refresh unread fail: ' + response.responseText);
				loading.className = "ignore";
			}.bind(that)
		});
	},
	onClick: function(event) {
		var target = event.target;
		Mojo.Log.info('onclick========--' + target.id);
		if (target.id == 'refreshBtn') {
			this.refreshClick(event);
		} else if (target.id == 'addBtn') {
			this.itemAdd(event);
		}
	},
	activate: function(event) {
		var that = this;
		if (Global.authInfo.user.status < 3) {
			this.controller.stageController.pushScene('complete');
			return;
		}
		this.controller.document.addEventListener("click", this.onClickReal, true);

		if(event) {
			Mojo.Log.error('evented main: ' + JSON.stringify(event));
		}
		if (event && (event.hasOwnProperty('phoneNumbers') || event.details && event.details.record && event.details.record.phoneNumbers)) {
			var phoneNumbers;
			var name;
			if(event.phoneNumbers) {
				//webOS 2.x
				phoneNumbers = event.phoneNumbers;
				name = event.name.familyName + event.name.givenName;
			} else if(event.details && event.details.record && event.details.record.phoneNumbers) {
				//webOS 1.4.5
				phoneNumbers = event.details.record.phoneNumbers;
				name = event.details.record.lastName + event.details.record.firstName;
			} else {
				//this should not be called
				return;
			}
			Mojo.Log.error('people: ' + JSON.stringify(phoneNumbers));
			if (phoneNumbers.length > 0) {
				if (phoneNumbers.length == 1) {
					var people = {
						name: name,
						mobile: phoneNumbers[0].value
					};
					that.talkTo(people);
				} else {
					var choices = [];
					for (var i = 0; i < phoneNumbers.length; ++i) {
						var num = phoneNumbers[i].value;
						choices.push({
							label: num,
							value: num,
							type: 'affirmative'
						});
					}
					this.controller.showAlertDialog({
						onChoose: function(what) {
							//NotifyHelper.instance().banner('what: ' + what);
							if (what) {
								var people = {
									name: name,
									mobile: what
								};
								that.talkTo(people);
							}
						}.bind(that),
						title: '选择一个手机号',
						message: '选择您要发给 ' + name + ' 的哪个号码',
						choices: choices
					});
				}
			}
		} else {
			that.refreshDataFromDB();
		}
	},
	refreshDataFromDB: function() {
		var that = this;
		RabbitDB.instance().getConvList(function(result) {
			Mojo.Log.info('get conv list success ---' + result.length);
			that.modelList.setItems(result);
			that.controller.modelChanged(that.modelList);
			if (Global.hasNewUnread) {
				that.list.mojo.revealItem(0, true);
				Global.hasNewUnread = false;
			}
		});
	},
	talkTo: function(people) {
		var that = this;
		Mojo.Log.info(this.TAG, 'getting people uid ====' + people.mobile);
		//NotifyHelper.instance().banner('getting people: ' + people.mobile);
		new interfaces.Momo().postRegisterCreateAt([people], {
			onSuccess: function(hey) {
				//NotifyHelper.instance().banner('create success' + hey.responseJSON[0].mobile);
				//people.mobile = hey.responseJSON[0].mobile;
				new interfaces.Momo().postUserShowByMobile(people, {
					onSuccess: function(response) {
						var res = response.responseJSON;
						var willTalk = {
							id: res.user_id,
							name: res.name,
							avatar: res.avatar
						};
						this.controller.stageController.pushScene('conv-detail', {
							item: willTalk
						});
					}.bind(that),
					onFailure: function(response) {
						//NotifyHelper.instance().banner('get user info fail' + response.responseText);
						NotifyHelper.instance().banner('get user info fail' + response.responseJSON.error);
					}.bind(that)
				});
			}.bind(that),
			onFailure: function(hell) {
				NotifyHelper.instance().banner('create failure:' + hell.responseText);
			}
		});
	},
	deactivate: function(event) {
		this.controller.document.removeEventListener("click", this.onClickReal, true);
	},
	handleCommand: function(event) {
		if (event.type === Mojo.Event.forward) {
			this.refreshClick();
		}
	},
	cleanup: function(event) {
		this.cleaning = true;
		//remove callback
		
		Global.updateUnRegister(this);
	}
});

function ConvAdapter() {
	this.items = [];
}

ConvAdapter.prototype = {
	addItem: function(item) {
		var that = this;
		if (!item.other) {
			item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
		}
		//that.items.push(item);
		Mojo.Log.info('add item to chat list: ' + that.items.length);
		for (var i = 0; i < that.items.length; ++i) {
			var curr = that.items[i];
			if (item.other.id == curr.other.id) {
				that.items.splice(i, 1);
				break;
			}
		}
		that.items.splice(0, 0, item);
	},
	setItems: function(items) {
		Mojo.Log.info('setting items=====' + items.length);
		this.items = [];
		for (var i = 0; i < items.length; ++i) {
			var item = items[i];
			if (!item.other) {
				item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
			}
			this.items.push(item);
		}
	}
};

