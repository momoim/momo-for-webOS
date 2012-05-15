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
		AppLauncher.onMsgSendError(chat);
		Global.force();
	},
	7000);
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

	//Mojo.Log.error(that.TAG, 'sendChat=---+---===== ui..' + JSON.stringify(chat));
	chat.data.state = RabbitDB.state.sending;
	AppLauncher.onNewIncome(chat);

	that.prepareChat(chat, function(chat) {
		that.addSendingChat(chat);
		if (Global.pluginAble()) {
			//send with plugin
			that.sendWithPlugin(chat, chat.data.receiver[0].id);
		} else {
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "chatSend",
				parameters: {
					auth: Global.authInfo,
					//chat: JSON.stringify(chat)
					chat: chat
				},
				onSuccess: function() {},
				onFailure: function(fail) {
					Mojo.Log.error('send chat fail' + JSON.stringify(chat));
					Global.keepAuth();
				}
			});
		}
	}.bind(that), function(chat) {
		//TODO resending
	}.bind(that));
};

/**
 * 是否网络地址，防止重复上传
 */
ChatSender.isHttpUrl = function(url) {
	return url && url.indexOf("http") != -1;
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
			if(ChatSender.isHttpUrl(localUrl)) {
				Mojo.Log.error(this.TAG, 'url is internet just send it');
				onPrepared(total);
				return;
			}
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
					var pResult = JSON.parse(resp.data);
					total.data.content.picture = {
						url: pResult.src
					};
					onPrepared(total);
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
			Mojo.Log.error(this.TAG, 'prepare audio ====' + content.audio.url);
			var currUrl = content.audio.url; 
			if(ChatSender.isHttpUrl(currUrl)) {
				Mojo.Log.error(this.TAG, 'url is internet just send it');
				onPrepared(total);
				return;
			}
			var idUrl = Setting.cache.audio + total.data.id + '.amr';
			new Mojo.Service.Request("palm://momo.im.app.service.node/", {
				method: "onFileRename",
				parameters: {
					path1: content.audio.url,
					path2: idUrl
				},
				onSuccess: function() {
					that.onAudioRenameSuccess(total, idUrl, onPrepared, onPrepareFail);
				},
				onFailure: function(fail) {
					Mojo.Log.error('audio:' + Object.toJSON(fail));
					//NotifyHelper.instance().banner('audio:' + Object.toJSON(fail));
					Global.AmrHelper.renameFile(content.audio.url, idUrl);
					that.onAudioRenameSuccess(total, idUrl, onPrepared, onPrepareFail);
				}
			});
		} else if (content.hasOwnProperty('file')) {
			var fileNow = content.file.url; 
			if(ChatSender.isHttpUrl(fileNow)) {
				Mojo.Log.error(this.TAG, 'url is internet just send it');
				onPrepared(total);
				return;
			}
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
					var fResult = JSON.parse(resp.data);
					total.data.content.file = {
						url: fResult.src,
						mime: fResult.mime,
						name: fResult.name,
						size: fResult.size
					};
					onPrepared(total);
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

ChatSender.prototype.onAudioRenameSuccess = function(total, idUrl, onPrepared, onPrepareFail) {
	var that = ChatSender.instance();
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
			Mojo.Log.error('on file upload' + JSON.stringify(resp));
			var aResult = JSON.parse(resp.data);
			total.data.content.audio = {
				url: aResult.src,
				duration: total.data.content.audio.duration
			};
			onPrepared(total);
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
};

ChatSender.prototype.sendWithPlugin = function(content, who) {
	if (Global.AmrHelper && Global.AmrHelper.sendMsg) {
		Mojo.Log.error('send content fail trying plugin: ' + JSON.stringify(content).length);
		var receiver = JSON.stringify({
			"uid": who
		});
		var content = JSON.stringify(content);
		if (content.length + receiver.length > 1024) {
			//TODO send roger with http and no need on webOS2.X
			if (content.kind === 'sms') {
				AppLauncher.onMsgSendError(chat);
			}
		} else {
			var args = [];
			args.push(receiver);
			for (var i = 0; i < content.length;) {
				var next = i + 255;
				if (next > content.length) {
					next = content.length;
				}
				var frame = content.substring(i, next);
				//Mojo.Log.error('content args index: ' + i + ' frame: ' + frame);
				args.push(frame);
				i = next;
			}
			Mojo.Log.error('content args length: ' + args.length);
			Global.AmrHelper.sendMsg.apply(Global.AmrHelper, args);
			Mojo.Log.error('content send with plugin passed');
			//TODO webOS2.x no need to do split Global.AmrHelper.sendMsg(receiver, content);
		}
	}
};

