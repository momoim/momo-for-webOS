var amqp = require('./amqp/amqp');

function MomoMQ(nodeService) {
	this.nodeService = nodeService;
	this.init();
}

MomoMQ.prototype.init = function() {
	var that = this;
	console.log('mq init');
	console.log('setting api' + Setting.api);
	this.connect();
};

MomoMQ.prototype.isAlive = function() {
	return this.connection && this.connection.readyState !== 'closed' && this.connection.writable;
};

MomoMQ.prototype.logUI = function(msg) {
			PalmCall.call('palm://com.palm.applicationManager', 'open', {
				'id': 'momo.im.app',
				'params': {
					'action': 'onConnError',
					'data': msg
				}
			});
};

var getStringCodePoints = (function() {
    function surrogatePairToCodePoint(charCode1, charCode2) {
        return ((charCode1 & 0x3FF) << 10) + (charCode2 & 0x3FF) + 0x10000;
    }

    // Read string in character by character and create an array of code points
    return function(str) {
        var codePoints = [], i = 0, charCode;
        while (i < str.length) {
            charCode = str.charCodeAt(i);
            if ((charCode & 0xF800) == 0xD800) {
                codePoints.push(surrogatePairToCodePoint(charCode, str.charCodeAt(++i)));
            } else {
                codePoints.push(charCode);
            }
            ++i;
        }
        return codePoints;
    };
})();

MomoMQ.prototype.connect = function(imm) {
	var that = this;
	var now = new Date();
	if (that.connectTime && !imm) {
		if ((now.getTime() - that.connectTime.getTime()) < 20000) {
			return;
		//} else {
			//that.logUI('on connection retrying after 20 seconds');
		}
	}
	that.connectTime = now;
	var config = {
		heartbeat: 30,
		host: Setting.mq.host,
		port: 5672,
		vhost: '/',
		login: that.nodeService.authInfo.oauthToken,
		password: that.nodeService.authInfo.tokenSecret
	};

	var configIn = {
		host: '192.168.94.20',
		port: 5672,
		vhost: '/',
		login: 'sifusf*4&5&343!',
		password: '123'
	};
	var connection = amqp.createConnection(config);
	connection.setNoDelay(true);
	that.connection = connection;

	console.log('connection created');

	try {
		connection.on('heartbeat', function() {
			console.log('on heartbeat');
		});
		connection.on('error', function(err) {
			console.log('on connection error: ' + JSON.stringify(err));
			that.logUI('connection error:' + JSON.stringify(err));
		});
		connection.addListener('ready', function() {
			console.log('connection ready');
			var exc = connection.exchange('momo_im', {
				passive: true
			},
			function(exchange) {
				console.log('exchange ' + exchange.name + ' is open');
			});
			that.exc = exc;
			var queue = connection.queue(that.nodeService.authInfo.queueName, {
				passive: false,
				durable: false,
				exclusive: false,
				autoDelete: false
			},
			function(queue) {
				console.log('queue declared');

				console.log('going to bind queue' + that.nodeService.authInfo.user.id);

				//mq message bind im
				var exchangeName = Setting.mq.exchange.im;
				queue.bind(exchangeName, '#.' + that.nodeService.authInfo.user.id + '.#');

				queue.subscribe(function(message, headers, deliveryInfo) {
					if (that.nodeService !== null) {
						var raw = JSON.parse(message.data.toString());
						raw.data.timestamp = deliveryInfo.timestamp; // * 1000;

						/*
						if(raw.data && raw.data.content && raw.data.content.text) {
						var strs = JSON.stringify(raw.data.content);
						var codes = getStringCodePoints(strs);
						console.log(codes.join(','));
						for(var i = 0; i < codes.length; ++i) {
							var code = codes[i];
							if(code > 65534) {
								console.log('message data ==========================>' + code);
							}
						}
						console.log('message data code ending==========');
						}
						*/
						var income = JSON.parse(JSON.stringify(raw));
						that.nodeService.receive.call(that.nodeService, raw);
						//send roger
						if (income.kind == 'sms') {
							var chat = income.data;
							var roger = {
								client_id: 7,
								sender: that.nodeService.authInfo.user.id,
								receiver: chat.sender.id,
								status: {
									msg_receive: {
										id: chat.id
									}
								}
							};
							if (chat.sender.id != that.nodeService.authInfo.user.id) {
								console.log('sending roger');
								exc.publish(chat.sender.id + '', JSON.stringify({
									kind: 'roger',
									data: roger
								}), {
									contentType: 'text/plain'
								});
							}
						}
					}
					console.log('on subscribed message:' + message.data.toString());
					for (var header in headers) {
						console.log('on headers: ' + header + ' : ' + headers[header]);
					}
					for (var info in deliveryInfo) {
						console.log('on delivery info: ' + info + ' : ' + deliveryInfo[info]);
					}
					for (var curr in message) {
						console.log(curr + ' ');
					}
					//console.log('on subscribed message:' + JSON.stringify(message));
				});
			});
		});
	} catch(e) {
		console.log('connection error');
	}

	connection.addListener('connected', function() {
		console.log('connection connected');
	});

	connection.addListener('closed', function() {
		console.log('connection closed');
		that.logUI('on connection closed');
		that.connect(true);
	});

	connection.addListener('end', function() {
		console.log('connection close');
		//that.logUI('on connection end');
		that.connect(true);
	});
};

MomoMQ.prototype.sendMsg = function(to, msg) {
	console.log('sending: ' + msg);
	var that = this;
	if (this.isAlive() && this.exc) {
		this.exc.publish(to, msg, {
			contentType: 'text/plain'
		});
	} else {
		console.log('send msg------failed! no connection now');
		that.logUI('on connection send fail');
		this.connect(true);
	}
};

module.exports = MomoMQ;

