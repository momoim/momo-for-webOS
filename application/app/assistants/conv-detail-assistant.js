var ConvDetailAssistant = Class.create({
	initialize: function(opts) {
		this.TAG = "ConvDetailAssistant";
		this.incomeItem = opts.item;
		Global.talking = this.incomeItem.id;
		Global.updateRegister(this);
	},
	setup: function() {
		var that = this;
        that.isplay = false;
		//Menu
		Global.menu(this.controller);
		//init ui
		that.idList = 'conv-list';

		//list scroller
		that.controller.setupWidget(that.idList + '-scroller', {
			mode: 'vertical'
		},
		{});
		this.controller.get(that.idList + '-scroller').setStyle({
			"max-height": this.controller.window.innerHeight + "px"
		});

		that.controller.setupWidget(that.idList, {
			itemTemplate: 'templates/conv-detail-list-item',
			listTemplate: 'templates/chat-conv-list',
			//dividerTemplate: 'templates/photo-list-divider',
			formatters: {
				content: AppFormatter.contentDetail.bind(that),
				sender: AppFormatter.sender.bind(that),
				timestamp: AppFormatter.time.bind(that),
                receiver: AppFormatter.type.bind(that)
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
		try {
			//this.captureHelper = new CaptureHelper();
		} catch(e) {
			//TODO plugin recorder
		}
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
			//that.list.mojo.revealItem(result.length - 1, false);
			that.updateScroller();
			//发送已读
			if (result.length > 0) {
				Global.sendRogerRead(result[result.length - 1].id);
			}
		});

		this.elTextField = this.controller.document.getElementById('comment-content');
		this.elButtonRecord = this.controller.document.getElementById('audio-recorder');
		if (Global.configs.lastSwitcher == 'sound') {
			this.switchToSound();
		} else {
			this.switchToText();
		}

	},
	updateScroller: function() {
		var that = this;
		var listScroller = that.controller.get(that.idList + '-scroller');
		if (listScroller) {
			listScroller.mojo.revealBottom();
			//Mojo.Log.warn(listScroller.outerHTML);
			var position = listScroller.mojo.getScrollPosition();
			Mojo.Log.warn('scroller position -------->' + position.top);
			listScroller.mojo.scrollTo(0, - 99999999, false);
			var t = setTimeout(function() {
				listScroller.mojo.scrollTo(0, - 99999999, false);
				clearTimeout(t);
			},
			30);
		}
	},
	update: function(message) {
		var that = this;
		//NotifyHelper.instance().banner('got meesage: ' + JSON.stringify(message.content));
		if (Global.talking == message.other.id) {
			that.modelList.addItem(message);
			that.controller.modelChanged(that.modelList);
			//that.list.mojo.revealItem(that.modelList.items.length, false);
			this.updateScroller();
		}
	},
	listWasTapped: function(event) {
		Mojo.Log.info('listWasTapped');
		if (event.item.content && event.item.content.hasOwnProperty('text')) {
			NotifyHelper.instance().banner('text coppied', true);
			this.controller.stageController.setClipboard(event.item.content.text);
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
		} else if (event.keyCode == 32) {
			//space keyup
			if (Global.configs.lastSwitcher == 'sound') {
				//it's record state
				if (this.audioFile == '') {
					this.onRecordStart();
				} else {
					this.onRecordEnd();
				}
			}
		}
	},
	sendChat: function(content) {
		var chat = ChatSender.instance().createChat(content, this.incomeItem);
		ChatSender.instance().sendChat(chat);
	},
	onClick: function(event) {
		Mojo.Log.error(this.TAG, 'onClick: ' + event.target.outerHTML);
		var that = this;
		var target = event.target;
        var tempParentNode = target;
        for(var i = 0; i < 5; i++){
            if(tempParentNode.hasAttribute('data-type') && tempParentNode.getAttribute('data-type') == 'audio'){
                target = tempParentNode.querySelector('.content > img');
                break;
            }else{
                tempParentNode = tempParentNode.parentNode;
                Mojo.Log.error('parent================>' + tempParentNode.outerHTML);
            }
        }
        Mojo.Log.error('target================>' + target);
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
						if (Global.AmrHelper) {
							var what = Global.AmrHelper.fileInfo(idUrl);
							Mojo.Log.error('file info get from amrhelper: ' + what);
							if (what === "ok") {
								Mojo.Log.error('file info get from amrhelper: success ');
								chatFileSuccess();
							} else {
								//download from internet
								that.controller.serviceRequest('palm://com.palm.downloadmanager/', {
									method: 'download',
									parameters: {
										target: fileSrc,
										targetDir: Setting.cache.file,
										targetFilename: target.getAttribute('file-name'),
										keepFilenameOnRedirect: false,
										subscribe: true
									},
									onSuccess: function(resp) {
										Mojo.Log.error(Object.toJSON(resp))
										if(resp.completed && resp.completionStatusCode === 200) {
											chatFileSuccess();
										}
									},
									onFailure: function(e) {
										Mojo.Log.error(Object.toJSON(e))
										chatFileFailed();
									}
								});
							}
						} else {
							chatFileFailed();
						}
					}
				});
				break;
			case 'chat-audio':
                var parent = target.parentNode.parentNode;
				var audioSrc = target.getAttribute('audio-src');
                parent.className = 'detail-content audio actived';
				target.setAttribute('src', 'images/chat/record_end.png');
				Mojo.Log.info(this.TAG, 'chat audio click: ' + audioSrc);
				if (!Global.audioPlayer) {
                    Global.audioPlayer = new Audio();
                    Global.audioPlayer.addEventListener("ended", function(){
                        parent.className = 'detail-content audio';
				        target.setAttribute('src', 'images/chat/chat_bg_audio_normal.png');
                        that.isplay = false;
                    }, true);
				}
                if(that.isplay){
                    Global.audioPlayer.pause();
                    parent.className = 'detail-content audio';
				    target.setAttribute('src', 'images/chat/chat_bg_audio_normal.png');
                    that.isplay = false;
                }else{
                    that.isplay = true;
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
                                        parent.className = 'detail-content audio';
                                        if (response.error) {
                                            Mojo.Log.warn('file not exists donwload fail:' + idUrl);
                                            fileFailed();
                                            //NotifyHelper.instance().banner(Object.toJSON(response.error));
                                            target.setAttribute('src', 'images/chat/chat_bg_audio_normal.png');
                                        } else {
                                            Mojo.Log.warn('file not exists donwload success:' + idUrl);
                                            fileSuccess();
                                            target.setAttribute('src', 'images/chat/chat_bg_audio_normal.png');
                                            //NotifyHelper.instance().banner('cache success');
                                        }
                                    },
                                    onFailure: function(fail) {
                                        parent.className = 'detail-content audio';
                                        fileFailed();
                                        target.setAttribute('src', 'images/chat/chat_bg_audio_normal.png');
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
                            if (Global.AmrHelper) {
                                var what = Global.AmrHelper.fileInfo(idUrl);
                                Mojo.Log.error('file info get from amrhelper: ' + what);
                                if (what === "ok") {
                                    Mojo.Log.error('file info get from amrhelper: success ');
                                    fileSuccess();
                                } else {
                                    //download from internet
                                    that.controller.serviceRequest('palm://com.palm.downloadmanager/', {
                                        method: 'download',
                                        parameters: {
                                            target: audioSrc,
                                            targetDir: Setting.cache.audio,
                                            targetFilename: dataID + '.amr',
                                            keepFilenameOnRedirect: false,
                                            subscribe: true
                                        },
                                        onSuccess: function(resp) {
                                            Mojo.Log.error(Object.toJSON(resp))
                                            if(resp.completed && resp.completionStatusCode === 200) {
                                                fileSuccess();
                                            }
                                        },
                                        onFailure: function(e) {
                                            Mojo.Log.error(Object.toJSON(e))
                                            fileFailed();
                                        }
                                    });
                                }
                            } else {
                                fileFailed();
                            }
                        }
                    });
                }
				
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
		Global.configs.lastSwitcher = 'text';
		DBHelper.instance().add('configs', Global.configs);
	},
	switchToSound: function() {
		this.elButtonRecord.style.display = 'block';
		this.elTextField.style.display = 'none';
		Global.configs.lastSwitcher = 'sound';
		DBHelper.instance().add('configs', Global.configs);
	},
	isNotRecordable: function() {
		return (!this.captureHelper && (!Global.AmrHelper || ! Global.AmrHelper.startRecord));
	},
	onRecordStart: function() {
		var self = this;
		if (this.isNotRecordable()) return;

		if (Global.audioPlayer) {
			Global.audioPlayer.pause();
		}
		self.controller.get('recording').style.display = 'block';

		//start recording
		self.audioFile = 'temply_' + guidGenerator();
		if (this.captureHelper) {
			this.captureHelper.startRecording(self.audioFile, function(response) {
				Mojo.Log.info(self.TAG, 'startAudioCapture.');
			});
		} else {
			var wavfile = VR_FOLDER + self.audioFile + VR_EXTENSION;
			Global.AmrHelper.startRecord(wavfile);
		}
		this.t60 = setTimeout(self.onRecordEnd.bind(self), 60000);
	},
	//this is called by the plugin
	sendAudioFromPlugin: function(result, infile, outfile, duration) {
		var self = this;
		//NotifyHelper.instance().banner('on audio: ' + String(result) + String(infile));
		//get chat obj from Global.convertingAmrList
		var chated = null;
		for (var i = 0; i < Global.convertingAmrList.length; ++i) {
			var chat = Global.convertingAmrList[i];
			if (chat.data.content.audio.url == outfile) {
				chated = chat;
				Global.convertingAmrList.splice(i, 1);
				break;
			}
		}

		if (!chated) {
			return;
		}

		if (result == 'success') {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "onFileDel",
				parameters: {
					path: infile,
				},
				onSuccess: function() {},
				onFailure: function() {
					Global.AmrHelper.delFile(infile);
				}
			});
			chated.data.content.audio.url = outfile;
		} else {
			chated.data.content.audio.url = infile;
		}
		Mojo.Log.error('sending audio');
		ChatSender.instance().sendChat(chated);
	},
	onRecordEnd: function() {
		if (this.isNotRecordable()) {
			return;
		}
		if (this.t60) {
			clearTimeout(this.t60);
		}
		var self = this;
		if (self.controller) {
			self.controller.get('recording').style.display = 'none';
		}

		var wavfile = VR_FOLDER + self.audioFile + VR_EXTENSION;
		var amrfile = VR_FOLDER + self.audioFile + VR_EXTENSION_AMR;
		var audiofile = wavfile;
		//reset recording file
		if (this.captureHelper || Global.AmrHelper.recordEnding) {
			Mojo.Log.error('on plugin record ended really!-----+');
			self.audioFile = '';
		}

		var duration = 1500;
		if (this.captureHelper) {
			duration = this.captureHelper.stopRecording();
		} else {
			if (!Global.AmrHelper.recordEnding) {
				Global.AmrHelper.onRecordEnding = function(duration) {
					setTimeout(function() {
						Mojo.Log.error('on plugin record ended!-----+');
						//record ended really
						Global.AmrHelper.recordEnding = true;
						self.onRecordEnd(duration);
					}.bind(self), 20);
				};
				if (self.audioFile != '') {
					Global.AmrHelper.stopRecord();
				}
				return;
			} else {
				Global.AmrHelper.recordEnding = false;
			}
			duration = Global.AmrHelper.getDuration(wavfile);
			Mojo.Log.error('wav duration got: ' + duration);
		}
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
				Mojo.Log.error('amr convert result: ' + amred);
				if (amred == 'ok') {
					//NotifyHelper.instance().banner('amr converting');
					//waiting for c plugin to call sendAudioFromPlugin
					Global.convertingAmrList.push(
					ChatSender.instance().createChat({
						audio: {
							url: amrfile,
							duration: duration
						}
					},
					self.incomeItem));
				} else {
					//NotifyHelper.instance().banner('amr convert wrong: ' + amred);
					sendAudio();

				}
			} catch(e) {
				Mojo.Log.error('amr convert fail: ' + JSON.stringify(e));
				//NotifyHelper.instance().banner('a:' + e);
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

		if (this.audioFile !== '') {
			//NotifyHelper.instance().banner('deactivate' + this.audioFile);
			this.onRecordEnd();
		}

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
		if(that.items[that.items.length - 1].id == item.id) {
			that.items[that.items.length - 1] = item;
			Mojo.Log.error('item replace for existing');
		} else {
			that.items.push(item);
			Mojo.Log.info('add item to chat list: ' + that.items.length);
		}
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

