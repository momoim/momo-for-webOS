var ConvDetailAssistant = Class.create({
	initialize: function(opts) {
		this.TAG = "ConvDetailAssistant";
		this.incomeItem = opts.item;
		Global.talking = this.incomeItem.id;
	},
	setup: function() {
		var that = this;
		//Menu
		var menuItems = [
		Mojo.Menu.editItem, {
			label: '退出',
			command: 'cmdLogout'
		}];

		this.controller.setupWidget(Mojo.Menu.appMenu, {
			omitDefaultItems: true
		},
		{
			visible: true,
			items: menuItems
		});
		//init ui
		that.idList = 'conv-list';

		that.controller.setupWidget(that.idList, {
			itemTemplate: 'templates/conv-detail-list-item',
			listTemplate: 'templates/chat-conv-list',
			//dividerTemplate: 'templates/photo-list-divider',
			formatters: {
				content: AppFormatter.contentDetail.bind(that),
				sender: AppFormatter.sender.bind(that),
				timestamp: AppFormatter.time.bind(that)
			},
			uniquenessProperty: 'id',
			fixedHeightItems: false,
			hasNoWidgets: true
		},
		that.modelList = new ConvAdapter());
		that.list = that.controller.get(that.idList);

		Mojo.Event.listen(this.list, Mojo.Event.listTap, this.listWasTapped.bind(this));

		this.modelComment = {
			content: '',
			replyto: null,
			disabled: false
		};

		//comment content textarea
		this.controller.setupWidget('comment-content', {
			hintText: $L('快说~'),
			multiline: true,
			modelProperty: 'content',
			enterSubmits: true
		},
		this.modelComment);
		this.commentContent = this.controller.get('comment-content');

		//recorder button
		this.controller.setupWidget('audio-recorder', {
			type: Mojo.Widget.defaultButton
		},
		this.modelSignin = {
			buttonLabel: $L("按住录音"),
			buttonClass: 'affirmative',
			disabled: false
		});

		//录音辅助类
		this.captureHelper = new CaptureHelper();
		this.audioFile = '';

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

		//发送已读
		Global.sendRoger();

		this.elTextField = this.controller.document.getElementById('comment-content');
		this.elButtonRecord = this.controller.document.getElementById('audio-recorder');
		if (Global.lastSwitcher == 'sound') {
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
	listWasTapped: function(event) {
		Mojo.Log.info('listWasTapped');
		if (event.item.content && event.item.content.hasOwnProperty('text')) {
			NotifyHelper.instance().banner('text coppied', true);
			this.controller.stageController.setClipboard(event.item.content.text);
			/*
			this.sendChat({
				text: event.item.content.text
			});
			*/
		}
	},
	keyUpHandler: function(event) {
		if (Mojo.Char.isEnterKey(event.keyCode)) {
			var content = this.controller.get('comment-content').mojo.getValue();
			this.controller.get('comment-content').mojo.setValue('');
			Mojo.Log.info(this.TAG, 'on comment area enter key: ' + content);
			if (content !== '') {
				this.sendChat({
					text: content
				});
			}
			else {
				Mojo.Log.info(this.TAG, 'on comment area enter key is null content');
			}
		} else if(event.keyCode == 32) {
			//space keyup
			if(Global.lastSwitcher == 'sound') {
				//it's record state
				if(this.audioFile == '') {
					this.onRecordStart();
				} else {
					this.onRecordEnd();
				}
			}
		}
	},
	prepareChat: function(total, onPrepared, onPrepareFail) {
		var that = this;
		Mojo.Log.info(this.TAG, 'prepareChat------+');
		var chat;
		if (!total) {
			return;
		} else {
			chat = total.data;
		}
		if (chat && chat.content) {
			Mojo.Log.info(this.TAG, 'prepareChat------+--+');
			var content = chat.content;
			if (content.hasOwnProperty('text')) {
				onPrepared(total);
			} else if (content.hasOwnProperty('picture')) {
				var localUrl = content.picture.url;
				Mojo.Log.warn(this.TAG, 'prepare picture ====' + localUrl);
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "onFileUpload",
					parameters: {
						file: localUrl,
						path: '/photo/upload.json',
						authInfo: Global.authInfo,
						action: 'send-msg',
						data: total
					},
					onSuccess: function(resp) {
						Mojo.Log.warn('on file upload' + JSON.stringify(resp));
					},
					onFailure: function(e) {
						Mojo.Log.warn('on file upload fail' + JSON.stringify(e));
					}
				});
				/*
				return;
				new interfaces.Momo().postPhotoUpload(this.controller, localUrl, {
					onSuccess: function(resp) {
						//Mojo.Log.warn('Success : ' + Object.toJSON(resp));
						if (resp.httpCode != 200) return;
						//NotifyHelper.instance().banner('image success:' + Object.toJSON(resp));
						var imgUrl = JSON.parse(resp.responseString).src;
						if (!imgUrl || imgUrl === '') {
							onPrepareFail(total);
						} else {
							total.data.content.picture = {
								url: imgUrl
							};
							onPrepared(total);
						}
					}.bind(this),
					onFailure: function(e) {
						NotifyHelper.instance().banner('image fail:' + Object.toJSON(e));
						Mojo.Log.error('Failure : ' + Object.toJSON(e));
						onPrepareFail(total);
					}.bind(this)
				});
				*/
			} else if (content.hasOwnProperty('audio')) {
				Mojo.Log.info(this.TAG, 'prepare audio ====' + content.audio.url);
				var idUrl = Setting.cache.audio + total.data.id + '.amr';
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "onFileRename",
					parameters: {
						path1: content.audio.url,
						path2: idUrl
					},
					onSuccess: function() {
						//NotifyHelper.instance().banner('audio renamed!===');
						new Mojo.Service.Request("palm://momo.im.app.service.node/", {
							method: "onFileUpload",
							parameters: {
								file: idUrl,
								authInfo: Global.authInfo,
								action: 'send-msg',
								data: total
							},
							onSuccess: function(resp) {
								Mojo.Log.warn('on file upload' + JSON.stringify(resp));
							},
							onFailure: function(e) {
								Mojo.Log.warn('on file upload fail' + JSON.stringify(e));
							}
						});
						return;
						/*
						new interfaces.Momo().postFileUpload(that.controller, idUrl, {
							onSuccess: function(resp) {
								Mojo.Log.warn('Success : ' + ' --' + resp.httpCode + '==' + Object.toJSON(resp));
								if (resp.httpCode != 200) return;
								//NotifyHelper.instance().banner('audio success:' + Object.toJSON(resp));
								var audioUrl = JSON.parse(resp.responseString).src;
								if (!audioUrl || audioUrl === '') {
									onPrepareFail(total);
								} else {
									total.data.content.audio = {
										url: audioUrl,
										duration: total.data.content.audio.duration
									};
									onPrepared(total);
								}
							}.bind(this),
							onFailure: function(e) {
								Mojo.Log.info('Failure : ' + Object.toJSON(e));
								onPrepareFail(total);
							}.bind(this)
						});
						*/
					},
					onFailure: function(fail) {
						Mojo.Log.warn('audio:' + Object.toJSON(fail));
						NotifyHelper.instance().banner('audio:' + Object.toJSON(fail));
					}
				});
			} else if (content.hasOwnProperty('file')) {
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "onFileUpload",
					parameters: {
						file: content.file.url,
						authInfo: Global.authInfo,
						action: 'send-msg',
						data: total
					},
					onSuccess: function(resp) {
						Mojo.Log.warn('on file upload' + JSON.stringify(resp));
					},
					onFailure: function(e) {
						Mojo.Log.warn('on file upload fail' + JSON.stringify(e));
					}
				});
				return;
				/*
				new interfaces.Momo().postFileUpload(that.controller, content.file.url, {
					onSuccess: function(resp) {
						Mojo.Log.warn('file upload success: ' + Object.toJSON(resp));
						if (resp.httpCode != 200) return;
						var result = JSON.parse(resp.responseString);
						if (result.src && result.src !== '') {
							total.data.content.file = {
								url: result.src,
								mime: result.mime,
								name: result.name,
								size: result.size
							};
							onPrepared(total);
						} else {
							onPrepareFail(total);
						}
					},
					onFailure: function(e) {
						Mojo.Log.error('file upload fail: ' + Object.toJSON(e));
						onPrepareFail(total);
					}
				});
				*/
			} else {
				Mojo.Log.info(this.TAG, 'prepare other ====');
				onPrepared(total);
			}
		}
	},
	createChat: function(content) {
		var chat = {
			kind: 'sms',
			data: {
				id: guidGenerator(),
				client_id: 7,
				sender: Global.authInfo.user,
				receiver: [this.incomeItem],
				content: content
			}
		};
		return chat;
	},
	sendChat: function(content) {
		this.sendChated(this.createChat(content));
	},
	sendChated: function(chat) {
		Mojo.Log.info(this.TAG, 'sendChat====== ' + JSON.stringify(content));
		var content = chat.data.content;

		Mojo.Log.info(this.TAG, 'sendChat=---+---===== ' + JSON.stringify(chat));

		this.prepareChat(chat, function(chat) {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "chatSend",
				parameters: {
					auth: Global.authInfo,
					//chat: JSON.stringify(chat)
					chat: chat
				},
				onSuccess: function() {},
				onFailure: function(fail) {
					Mojo.Log.info('send chat fail' + JSON.stringify(fail));
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
			case 'chat-file':
				var fileSrc = target.getAttribute('file-src');
				Mojo.Log.info(this.TAG, 'chat audio click: ' + fileSrc);
				var idUrl = Setting.cache.file + target.getAttribute('file-name');

				function chatFileFailed() {
					//open with url
					new Mojo.Service.Request('palm://com.palm.applicationManager', {
						method: 'open',
						parameters: {
							id: 'com.palm.app.browser',
							params: {
								target: fileSrc
							}
						}
					});
				}
				function chatFileSuccess() {
					//open with local file
					new Mojo.Service.Request('palm://com.palm.applicationManager', {
						method: 'open',
						parameters: {
							target: idUrl
						}
					});
					NotifyHelper.instance().banner('file saved:' + idUrl, true);
				}
				Mojo.Log.warn('try to check file exist');
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "onFileInfo",
					parameters: {
						path: idUrl
					},
					onSuccess: function(response) {
						if (response.error) {
							Mojo.Log.warn('file not exists:' + idUrl);
							//fileFailed();
							//NotifyHelper.instance().banner(Object.toJSON(response.error));
							new Mojo.Service.Request("palm://momo.im.app.service.node/", {
								method: "onFileDownload",
								parameters: {
									path: idUrl,
									url: fileSrc
								},
								onSuccess: function(response) {
									if (response.error) {
										Mojo.Log.warn('file not exists donwload fail:' + idUrl);
										chatFileFailed();
										//NotifyHelper.instance().banner(Object.toJSON(response.error));
									} else {
										Mojo.Log.warn('file not exists donwload success:' + idUrl);
										chatFileSuccess();
										//NotifyHelper.instance().banner('cache success');
									}
								},
								onFailure: function(fail) {
									chatFileFailed();
									//NotifyHelper.instance().banner('cache service fail');
								}
							});
						} else {
							Mojo.Log.warn('file exists:' + idUrl);
							chatFileSuccess();
							//NotifyHelper.instance().banner('cache get success');
						}
					},
					onFailure: function(fail) {
						Mojo.Log.warn('file info get fail:' + JSON.stringify(fail));
						chatFileFailed();
					}
				});
				break;
			case 'chat-audio':
				var audioSrc = target.getAttribute('audio-src');
				Mojo.Log.info(this.TAG, 'chat audio click: ' + audioSrc);
				if (!Global.audioPlayer) {
					Global.audioPlayer = new Audio();
				}
				var idUrl = Setting.cache.audio + dataID + '.amr';
				function fileFailed() {
					Global.audioPlayer.volume = 1;
					Global.audioPlayer.pause();
					Global.audioPlayer.src = audioSrc;
					Global.audioPlayer.load();
					Global.audioPlayer.play();
				}
				function fileSuccess() {
					Global.audioPlayer.volume = 1;
					Global.audioPlayer.pause();
					Global.audioPlayer.src = idUrl;
					Global.audioPlayer.load();
					Global.audioPlayer.play();
				}
				Mojo.Log.warn('try to get audio file to play');
				new Mojo.Service.Request("palm://momo.im.app.service.node/", {
					method: "onFileInfo",
					parameters: {
						path: idUrl
					},
					onSuccess: function(response) {
						if (response.error) {
							Mojo.Log.warn('file not exists:' + idUrl);
							//fileFailed();
							//NotifyHelper.instance().banner(Object.toJSON(response.error));
							new Mojo.Service.Request("palm://momo.im.app.service.node/", {
								method: "onFileDownload",
								parameters: {
									path: idUrl,
									url: audioSrc
								},
								onSuccess: function(response) {
									if (response.error) {
										Mojo.Log.warn('file not exists donwload fail:' + idUrl);
										fileFailed();
										//NotifyHelper.instance().banner(Object.toJSON(response.error));
									} else {
										Mojo.Log.warn('file not exists donwload success:' + idUrl);
										fileSuccess();
										//NotifyHelper.instance().banner('cache success');
									}
								},
								onFailure: function(fail) {
									fileFailed();
									//NotifyHelper.instance().banner('cache service fail');
								}
							});
						} else {
							Mojo.Log.warn('file exists:' + idUrl);
							fileSuccess();
							//NotifyHelper.instance().banner('cache get success');
						}
					},
					onFailure: function(fail) {
						Mojo.Log.warn('file info get fail:' + JSON.stringify(fail));
						fileFailed();
					}
				});
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
					Mojo.Log.warn(self.TAG, JSON.stringify(file) + '------------' + file.fullPath);
					if (file.attachmentType == 'image') {
						self.sendChat({
							picture: {
								url: file.fullPath
							}
						});
					} else {
						self.sendChat({
							file: {
								url: file.fullPath
							}
						});
					}
				}
			};

			Mojo.FilePicker.pickFile(params, this.controller.stageController);

		} else if (target.id == 'sendButton') {
			if (this.elTextField.style.display == 'none') {
				this.switchToText();
			} else {
				this.switchToSound();
			}
		}
	},
	switchToText: function() {
		this.elButtonRecord.style.display = 'none';
		this.elTextField.style.display = 'block';
		if (this.commentContent.mojo) {
			this.commentContent.mojo.focus();
		}
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
		this.captureHelper.startRecording(self.audioFile, function(response) {
			Mojo.Log.info(self.TAG, 'startAudioCapture.');
		});
		setTimeout(self.onRecordEnd.bind(self), 60000);
	},
	//this is called by the plugin
	sendAudioFromPlugin: function(result, infile, outfile, duration) {
		var self = this;
		//NotifyHelper.instance().banner('on audio: ' + String(result) + String(infile));
		
		//get chat obj from Global.convertingAmrList
		var chated = null;
		for(var i = 0; i < Global.convertingAmrList.length; ++9) {
			var chat = Global.convertingAmrList[i];
			if(chat.data.content.audio.url == outfile) {
				chated = chat;
				Global.convertingAmrList.splice(i, 1);
				break;
			}
		}

		if(!chated) {
			return;
		}

		if (result == 'success') {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "onFileDel",
				parameters: {
					path: infile,
				},
				onSuccess: function() {},
				onFailure: function() {}
			});
			chated.data.content.audio.url = outfile;
		} else {
			chated.data.content.audio.url = infile;
		}
		self.sendChated(chated);
	},
	onRecordEnd: function() {
		var self = this;

		var wavfile = VR_FOLDER + self.audioFile + VR_EXTENSION;
		var amrfile = VR_FOLDER + self.audioFile + VR_EXTENSION_AMR;
		var audiofile = wavfile;
		//reset recording file
		self.audioFile = '';

		var duration = this.captureHelper.stopRecording();
		if (duration < 1000) {
			NotifyHelper.instance().banner('Hey! too short!');
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "onFileDel",
				parameters: {
					path: wavfile,
				},
				onSuccess: function() {},
				onFailure: function() {}
			});
			return;
		}


		function sendAudio() {
			self.sendChat({
				audio: {
					url: audiofile,
					duration: duration
				}
			});
		}

		if (Global.AmrHelper) {
			Global.AmrHelper.onAmr = self.sendAudioFromPlugin.bind(self);
		}

		if (Global.AmrHelper && Global.AmrHelper.isReady) {
			//NotifyHelper.instance().banner('is ready ..');
			try {
				var amred = Global.AmrHelper.wave2amr(wavfile, amrfile, duration + '');
				//var amred = Global.AmrHelper.wave2amr(wavfile, amrfile);
				if (amred == 'ok') {
					//NotifyHelper.instance().banner('amr converting');
					//waiting for c plugin to call sendAudioFromPlugin
					Global.convertingAmrList.push(
						self.createChat({
							audio: {
								url: amrfile,
								duration: duration
							}
						})
					);
				} else {
					//NotifyHelper.instance().banner('amr convert wrong: ' + amred);
					sendAudio();

				}
			} catch(e) {
				NotifyHelper.instance().banner('a:' + e);
				sendAudio();
				//self.list.innerHTML = e + '';
			}
		} else {
			sendAudio();
		}
	},
	onMouseUp: function() {
		if (this.audioFile !== '') {
			this.onRecordEnd();
		}
	},
	activate: function(event) {
		var that = this;

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

		if(this.audioFile !== '') {
			//NotifyHelper.instance().banner('deactivate' + this.audioFile);
			this.onRecordEnd();
		}
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
		that.items.push(item);
		Mojo.Log.info('add item to chat list: ' + that.items.length);
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

