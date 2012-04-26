var onFileDel = function() {};
onFileDel.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path = this.controller.args.path;

		fs.unlink(path, function(err) {
			future.result = {
				path: path,
				error: err
			};
		});
	}
};

var onFileInfo = function() {};
onFileInfo.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path = this.controller.args.path;

		fs.stat(path, function(err, stats) {
			future.result = {
				path: path,
				stats: stats,
				error: err
			};
		});
	}
};

var onFileRename = function() {};
onFileRename.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path1 = this.controller.args.path1;
		var path2 = this.controller.args.path2;

		fs.mkdir(Setting.CACHE_FOLDER, 755);
		fs.mkdir(Setting.cache.audio, 755);
		fs.mkdir(Setting.cache.photo, 755);
		fs.mkdir(Setting.cache.file, 755);

		fs.rename(path1, path2, function(err) {
			future.result = {
				path1: path1,
				path2: path2,
				error: err
			};
		});
	}
};

var onFileDownload = function() {};
onFileDownload.prototype = {
	run: function(future) {
		var http = IMPORTS.require('http');
		var fs = IMPORTS.require('fs');
		var url = IMPORTS.require('url');
		var path = IMPORTS.require('path');

		var filePath = this.controller.args.path;
		var fileUrl = this.controller.args.url;

		fs.mkdir(Setting.CACHE_FOLDER, 755);
		fs.mkdir(Setting.cache.audio, 755);
		fs.mkdir(Setting.cache.photo, 755);
		fs.mkdir(Setting.cache.file, 755);

		console.log('onfiledownload ======> ' + filePath);

		fs.stat(filePath, function(err, stats) {
			if (err) {
				console.log('onfiledownload ======> ' + filePath + ' err: ' + JSON.stringify(err));
				fs.writeFile(filePath, '', function(err) {
					if(err) {
						console.log('create file err: ' + JSON.stringify(err));
					} else {
						console.log('file created ' + filePath); 
					}
				});
				var host = url.parse(fileUrl).hostname;

				var httpClient = http.createClient(80, host);

				var request = httpClient.request('GET', fileUrl, {
					"host": host
				});
				request.end();

				request.on('response', function(response) {
					var downloadfile = fs.createWriteStream(filePath, {
						'flags': 'a'
					});
					response.on('data', function(chunk) {
						downloadfile.write(chunk, encoding = 'binary');
					});
					response.on('end', function() {
						downloadfile.end();
						future.result = {
							path: filePath,
							url: fileUrl
						};
					});
				});
			} else {
				console.error('file downloading or exist');
			}
		});

	}
};

var onFileUpload = function() {};

onFileUpload.prototype = {
	run: function(future) {
		console.log('on file upload');
		var that = this;
		var localPath = this.controller.args.file;
		that.authInfo = this.controller.args.authInfo;
		var path = this.controller.args.path;

		if (!path) {
			path = '/file/upload.json';
		}
		var url = Setting.protocol + Setting.api + path;
		var method = 'POST';

		var timestamp = OAuth.timestamp();
		var nonce = OAuth.nonce(20);
		var accessor = {
			consumerSecret: "b2734cdb56e00b01ca19d6931c6f9f30",
			tokenSecret: that.authInfo.tokenSecret
		};
		var message = {
			method: method,
			action: url,
			parameters: OAuth.decodeForm('')
		};
		message.parameters.push(['oauth_consumer_key', "15f0fd5931f17526873bf8959cbfef2a04dda2d84"]);
		message.parameters.push(['oauth_nonce', nonce]);
		message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
		message.parameters.push(['oauth_timestamp', timestamp]);
		message.parameters.push(['oauth_token', that.authInfo.oauthToken]);
		message.parameters.push(['oauth_version', '1.0']);
		message.parameters.sort();
		OAuth.SignatureMethod.sign(message, accessor);
		var authHeader = OAuth.getAuthorizationHeader("", message.parameters);

		var boundaryKey = Math.random().toString(16);

		var opts = {
			host: Setting.api,
			port: 80,
			path: path,
			headers: {
				'HOST': Setting.api,
				"Authorization": authHeader,
				'Content-Type': 'multipart/form-data; boundary=' + boundaryKey
			}
		};

		var httpClient = http.createClient(opts.port, opts.host);
		var request = httpClient.request(method, opts.path, opts.headers);

		request.on('response', function(response) {
			var status = response.statusCode;
			var reqResult = '';
			if (status !== 200) {
				response.on('data', function(chunk) {
					reqResult += chunk;
					console.log('on req fail chunk: ' + chunk.length + chunk);
					future.result = {
						errorCode: status,
						data: reqResult
					};
				});
				response.on('end', function() {
					console.log('on req fail chunk end');
					future.result = {
						errorCode: status,
						data: reqResult
					};
				});
			} else {
				response.on('data', function(chunk) {
					reqResult += chunk;
					console.log('on req chunk: ' + chunk.length + chunk);
					/*
					future.result = {
						data: reqResult
					}
					*/
					var actionData = that.controller.args.data;
					var json = JSON.parse(reqResult);
					that.gonnaSending(json, that.controller.args.action, actionData, future);
				});
				// why end not called?
				response.on('end', function() {
					/*
					future.result = {
						data: reqResult
					}
					*/
				});
			}
		});

		var fs = IMPORTS.require('fs');
		fs.readFile(localPath, function(err, data) {
			if (err) {
				console.log('on file upload data errr' + JSON.stringify(err));
				return;
			}
			if (data) {
				console.log('on file upload data:' + data.length);
				var filename = localPath.replace(/^.*[\\\/]/, '');
				var heading = '--' + boundaryKey + '\r\n' + 'Content-Disposition: form-data; name="media"; filename="' + filename + '"\r\n\r\n';
				//+ 'Content-Type: image/jpeg\r\n\r\n';
				request.write(new Buffer(heading, 'ascii'));
				request.write(data);
				request.write(new Buffer('\r\n--' + boundaryKey + '--', 'ascii'));
				request.end();
			}
		});
		//fs.createReadStream(localPath).pipe(request);
	},
	gonnaSending: function(json, action, actionData, future) {
		var that = this;
		switch (action) {
		case 'send-msg':
			var chat = actionData.data;
			if (chat.content) {
				if (chat.content.picture) {
					actionData.data.content.picture = {
						url: json.src
					};
				} else if (chat.content.file) {
					actionData.data.content.file = {
						url: json.src,
						mime: json.mime,
						name: json.name,
						size: json.size
					};
				} else if (chat.content.audio) {
					actionData.data.content.audio = {
						url: json.src,
						duration: chat.content.audio.duration
					};
				}

				NodeService.instance().send(future, {
					chat: actionData,
					auth: that.authInfo
				});
			}
			break;
		default:
			break;
		}
	}
};

