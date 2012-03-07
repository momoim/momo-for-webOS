var ConvDetailAssistant = Class.create({
	initialize: function(opts) {
		this.TAG = "ConvDetailAssistant";
		this.incomeItem = opts.item;
		Global.talking = this.incomeItem.id;
	},
	setup: function() {
		var that = this;

		//init ui
		that.idList = 'conv-list';

		that.controller.setupWidget(that.idList, {
			itemTemplate: 'templates/conv-detail-list-item',
			listTemplate: 'templates/chat-conv-list',
			//dividerTemplate: 'templates/photo-list-divider',
			formatters: {
				content: AppFormatter.contentDetail.bind(that),
				timestamp: AppFormatter.time.bind(that)
			},
			uniquenessProperty: 'id',
			fixedHeightItems: false,
			hasNoWidgets: true
		},
		that.modelList = new ConvAdapter());
		that.list = that.controller.get(that.idList);

		this.modelComment = {
			content: '',
			replyto: null,
			disabled: false
		};

		//comment content textarea
		this.controller.setupWidget('comment-content', {
			hintText: $L("快说~"),
			multiline: true,
			modelProperty: 'content',
			enterSubmits: true
		},
		this.modelComment);
		this.commentContent = this.controller.get('comment-content');
		
		//recorder button
		this.controller.setupWidget('audio-recorder', {
            type: Mojo.Widget.defaultButton 
        }, this.modelSignin = {
            buttonLabel: $L("按住录音"),
            buttonClass: 'affirmative',
            disabled: false
        });
		
		this.audioRecorder = this.controller.get('audio-recorder');
		this.controller.listen("audio-recorder", 'mousedown', this.onRecordStart.bind(this));

		//global events       
		this.keyUpHandlerReal = this.keyUpHandler.bind(this);
		this.onClickReal = this.onClick.bind(this);
		this.onMouseUpReal = this.onMouseUp.bind(this);

		//init data
		RabbitDB.instance().getTalkList(that.incomeItem.id, function(result) {
			Mojo.Log.info('get conv list success ---' + result.length);
			that.modelList.setItems(result);
			that.controller.modelChanged(that.modelList);
			that.list.mojo.revealItem(result.length - 1, false);
		});

		Global.sendRoger();
		
		this.captureHelper = new CaptureHelper();
		this.audioFile = '';
		this.elTextField = this.controller.document.getElementById('comment-content');
		this.elButtonRecord = this.controller.document.getElementById('audio-recorder');
		if(Global.lastSwitcher == 'sound') {
			this.switchToSound();
		} else {
			this.switchToText();
		}
	},
	update: function(message) {
		var that = this;
		if (Global.talking == message.other.id) {
			that.modelList.addItem(message);
			that.controller.modelChanged(that.modelList);
			that.list.mojo.revealItem(that.modelList.items.length, false);
		}
	},
	keyUpHandler: function(event) {
		if (Mojo.Char.isEnterKey(event.keyCode)) {
			var content = this.controller.get('comment-content').mojo.getValue();
			this.controller.get('comment-content').mojo.setValue('');
			Mojo.Log.info(this.TAG, 'on comment area enter key: ' + content);
			if (content != '') {
				this.sendChat({
					text: content
				});
			}
			else {
				Mojo.Log.info(this.TAG, 'on comment area enter key is null content');
			}
		}
	},
	prepareChat: function(total, onPrepared, onPrepareFail) {
		Mojo.Log.info(this.TAG, 'prepareChat------+');
		var chat;
		if (total == null) {
			return;
		} else {
			chat = total.data;
		}
		if (chat != null && chat.content != null) {
			Mojo.Log.info(this.TAG, 'prepareChat------+--+');
			var content = chat.content;
			if (content.hasOwnProperty('text')) {
				onPrepared(total);
			} else if (content.hasOwnProperty('picture')) {
				Mojo.Log.info(this.TAG, 'prepare picture ====' + content.picture.url);
				var url = Setting.protocol + Setting.api + "/photo/upload.json";
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

				//get local url
				var localUrl = content.picture.url;

				this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
					method: 'upload',
					parameters: {
						'fileName': localUrl,
						'fileLabel': 'media',
						'url': url,
						'contentType': 'image/jpg',
						"postParameters": [],
						customHttpHeaders: ['HOST:' + Setting.api, 'Authorization:' + authHeader],
						"subscribe": true
					},
					onSuccess: function(resp) {
						Mojo.Log.info('Success : ' + Object.toJSON(resp));
						total.data.content.picture = {
							url: JSON.parse(resp.responseString).src
						};
						onPrepared(total);
					}.bind(this),
					onFailure: function(e) {
						Mojo.Log.info('Failure : ' + Object.toJSON(e));
						onPrepareFail(total);
					}.bind(this)
				});
			} else if (content.hasOwnProperty('audio')) {
				Mojo.Log.info(this.TAG, 'prepare audio ====' + content.audio.url);
				var url = Setting.protocol + Setting.api + "/file/upload.json";
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

				//get local url
				var localUrl = content.audio.url;

				this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
					method: 'upload',
					parameters: {
						'fileName': localUrl,
						'fileLabel': 'media',
						'url': url,
						'contentType': 'image/jpg',
						"postParameters": [],
						customHttpHeaders: ['HOST:' + Setting.api, 'Authorization:' + authHeader],
						"subscribe": true
					},
					onSuccess: function(resp) {
						Mojo.Log.info('Success : ' + Object.toJSON(resp));
						total.data.content.audio = {
							url: JSON.parse(resp.responseString).src,
							duration: 0
						};
						onPrepared(total);
					}.bind(this),
					onFailure: function(e) {
						Mojo.Log.info('Failure : ' + Object.toJSON(e));
						onPrepareFail(total);
					}.bind(this)
				});
			} else {
				Mojo.Log.info(this.TAG, 'prepare picture ====' + content.picture.url);
			}
		}
	},
	sendChat: function(content) {
		Mojo.Log.info(this.TAG, 'sendChat====== ' + JSON.stringify(content));
		var chat = {
			kind: 'sms',
			data: {
				id: guidGenerator(),
				client_id: 7,
				sender: Global.authInfo.user,
				receiver: [this.incomeItem],
				content: content
			}
		}

		Mojo.Log.info(this.TAG, 'sendChat=---+---===== ' + JSON.stringify(chat));

		this.prepareChat(chat, function(chat) {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "chatSend",
				parameters: {
					auth: Global.authInfo,
					chat: chat
				},
				onSuccess: function() {},
				onFailure: function(fail) {
					Global.keepAuth();
				}
			});
		}.bind(this), function(chat) {
			//
		}.bind(this));

	},
	onClick: function(event) {
		Mojo.Log.info(this.TAG, 'onClick: ' + event.target.outerHTML);
		var target = event.target;
		if (target.hasAttribute('data-action')) {
			var action = target.getAttribute('data-action');
			var dataID = target.getAttribute('data-id');
			Mojo.Log.info(this.TAG, 'onClick: -----' + action);
			switch (action) {
			case 'chat-audio':
				var audioSrc = target.getAttribute('audio-src');
				Mojo.Log.info(this.TAG, 'chat audio click: ' + audioSrc);
				if (Global.audioPlayer == null) {
					Global.audioPlayer = new Audio();
				}
				Global.audioPlayer.pause();
				Global.audioPlayer.src = audioSrc;
				Global.audioPlayer.load();
				Global.audioPlayer.play();
				break;
			default:
				break;
			}
		}
		
		var self = this; //Retain the reference for the callback
		if (target.id == 'attachButton') {
			var params = {
				defaultKind: 'image',
				onSelect: function(file) {
					Mojo.Log.info(self.TAG, JSON.stringify(file) + '------------' + file.fullPath);
					self.sendChat({
						picture: {
							url: file.fullPath
						}
					});
				}
			}

			Mojo.FilePicker.pickFile(params, this.controller.stageController);

		} else if(target.id == 'sendButton') {
			if(this.elTextField.style.display == 'none') {
				this.switchToText();
			} else {
				this.switchToSound();
			}
		}
	},
	switchToText: function() {
		this.elButtonRecord.style.display = 'none';
		this.elTextField.style.display = 'block';
		this.commentContent.mojo.focus();
		Global.lastSwitcher = 'text';
		DBHelper.instance().add('lastSwitcher', Global.lastSwitcher);
	},
	switchToSound: function() {
		this.elButtonRecord.style.display = 'block';
		this.elTextField.style.display = 'none';
		Global.lastSwitcher = 'sound';
		DBHelper.instance().add('lastSwitcher', Global.lastSwitcher);
	},
	onRecordStart: function() {
		var self = this;
		
		//start recording
		self.audioFile = 'temply_' + guidGenerator();
		this.captureHelper.startRecording(self.audioFile, function (response) {
			Mojo.Log.info(self.TAG, 'startAudioCapture.');
		});
	},
	onRecordEnd: function() {
		var self = this;
		
		this.captureHelper.stopRecording();
		self.sendChat({
				audio: {
					url: VR_FOLDER + self.audioFile + VR_EXTENSION,
					duration: 0
				}
			});
		self.audioFile = '';
		
		this.audioRecorder.mojo.deactivate();
	},
	onMouseUp: function() {
		if(this.audioFile != '') {
			this.onRecordEnd();
		}
	},
	activate: function(event) {
		this.controller.document.addEventListener("keyup", this.keyUpHandlerReal, true);
		this.controller.document.addEventListener("click", this.onClickReal, true);
		this.controller.document.addEventListener("mouseup", this.onMouseUpReal, true);
	},
	deactivate: function(event) {
		this.controller.document.removeEventListener("keyup", this.keyUpHandlerReal, true);
		this.controller.document.removeEventListener("click", this.onClickReal, true);
		this.controller.document.removeEventListener("mouseup", this.onMouseUpReal, true);
	},
	cleanup: function(event) {
		Global.talking = '';
	}
});

function ConvAdapter() {
	this.items = [];
};

ConvAdapter.prototype = {
	addItem: function(item) {
		var that = this;
		if (item.other == null) {
			item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
		}
		that.items.push(item);
		Mojo.Log.info('add item to chat list: ' + that.items.length);
	},
	setItems: function(items) {
		Mojo.Log.info('setting items=====' + items.length);
		this.items = [];
		for (var i = 0; i < items.length; ++i) {
			var item = items[i];
			if (item.other == null) {
				item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
			}
			this.items.push(item);
		}
	}
}

