function ChatSender() {
	var that = this;
	this.TAG = 'ChatSender';
	this.sendingChat = [];
};

ChatSender.instance = function() {
	if (! (ChatSender.mInstance)) {
		ChatSender.mInstance = new ChatSender();
	};
	return ChatSender.mInstance;
};

ChatSender.prototype.createChat = function(content, receiver) {
	//NotifyHelper.instance().banner('createChat');
	var chat = {
		kind: 'sms',
		data: {
			id: guidGenerator(),
			client_id: 7,
			sender: Global.authInfo.user,
			receiver: [receiver],
			content: content
		}
	};
	return chat;
};

ChatSender.prototype.setController = function(controller) {
	var that = ChatSender.instance();
	that.controller = controller;
};

ChatSender.prototype.addSendingChat = function(chat) {
	var that = ChatSender.instance();
	chat.timing = setTimeout(function() {
		clearTimeout(chat.timing);
		//it's failed, force service to restart and send msg with http
		Mojo.Log.error(that.TAG, 'sending timeout !!!=====_+');
		new Mojo.Service.Request("palm://com.palm.applicationManager", {
			method: "launch",
			parameters: {
				id: Mojo.appInfo.id,
				params: {
					"action": "onMsgSendError",
					"data": JSON.stringify(chat)
				}
			},
			onSuccess: function(response) {},
			onFailure: function(response) {}
		});
		Global.force();
	},
	15000);
	that.sendingChat.push(chat);
};

ChatSender.prototype.removeSendingChat = function(chat) {
	var that = ChatSender.instance();
	for (var i = 0; i < that.sendingChat.length; ++i) {
		var item = that.sendingChat[i];
		if (item.data.id == chat.data.id) {
			clearTimeout(item.timing);
			that.sendingChat.splice(i, 1);
			break;
		}
	};
};

ChatSender.prototype.sendChat = function(chat) {
	//NotifyHelper.instance().banner('sendChat');
	var that = ChatSender.instance();
	var content = chat.data.content;

	Mojo.Log.info(that.TAG, 'sendChat=---+---===== ' + JSON.stringify(chat));

	that.prepareChat(chat, function(chat) {
		that.addSendingChat(chat);
		new Mojo.Service.Request("palm://momo.im.app.service.node/", {
			method: "chatSend",
			parameters: {
				auth: Global.authInfo,
				//chat: JSON.stringify(chat)
				chat: chat
			},
			onSuccess: function() {},
			onFailure: function(fail) {
				Mojo.Log.error('send chat fail' + JSON.stringify(fail));
				Global.keepAuth();
			}
		});
	}.bind(that), function(chat) {
		//TODO resending
	}.bind(that));
};

ChatSender.prototype.prepareChat = function(total, onPrepared, onPrepareFail) {
	//NotifyHelper.instance().banner('prepareChat');
	var that = this;
	Mojo.Log.error(this.TAG, 'prepareChat------+');
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
			Mojo.Log.error(this.TAG, 'prepare picture ====' + localUrl);
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
					Mojo.Log.error('on file upload' + JSON.stringify(resp));
				},
				onFailure: function(e) {
					Mojo.Log.error('on file upload fail' + JSON.stringify(e));
					new interfaces.Momo().postPhotoUpload(that.controller, localUrl, {
						onSuccess: function(resp) {
							Mojo.Log.error('retry photo Success : ' + Object.toJSON(resp));
							if (resp.httpCode != 200) return;
							//NotifyHelper.instance().banner('image success:' + Object.toJSON(resp));
							var imgUrl = JSON.parse(resp.responseString).src;
							if (!imgUrl || imgUrl === '') {
								//onPrepareFail(total);
							} else {
								total.data.content.picture = {
									url: imgUrl
								};
								onPrepared(total);
							}
						},
						onFailure: function(e) {
							NotifyHelper.instance().banner('image fail:' + Object.toJSON(e));
							Mojo.Log.error('photo Failure : ' + Object.toJSON(e));
							onPrepareFail(total);
						}
					});
				}
			});
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
							Mojo.Log.error('on file upload fail' + JSON.stringify(e) + ' audio: ' + idUrl + ' trying to upload with ui.');

							new interfaces.Momo().postFileUpload(that.controller, idUrl, {
								onSuccess: function(resp) {
									Mojo.Log.error('audio Success : ' + ' --' + resp.httpCode + '==' + Object.toJSON(resp));
									if (resp.httpCode != 200) return;
									var audioUrl = JSON.parse(resp.responseString).src;
									if (!audioUrl || audioUrl === '') {
										//FIXME do what ? onPrepareFail(total);
									} else {
										total.data.content.audio = {
											url: audioUrl,
											duration: total.data.content.audio.duration
										};
										onPrepared(total);
									}
								},
								onFailure: function(e) {
									Mojo.Log.error('Failure : ' + Object.toJSON(e));
									onPrepareFail(total);
								}
							});
						}
					});
				},
				onFailure: function(fail) {
					Mojo.Log.error('audio:' + Object.toJSON(fail));
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
					Mojo.Log.error('on file upload fail' + JSON.stringify(e));
					new interfaces.Momo().postFileUpload(that.controller, content.file.url, {
						onSuccess: function(resp) {
							Mojo.Log.error('file retry upload success: ' + Object.toJSON(resp));
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
								//onPrepareFail(total);
							}
						},
						onFailure: function(e) {
							Mojo.Log.error('file upload fail: ' + Object.toJSON(e));
							onPrepareFail(total);
						}
					});
				}
			});
			return;
			/*
				*/
		} else {
			Mojo.Log.info(this.TAG, 'prepare other ====');
			onPrepared(total);
		}
	}
};

