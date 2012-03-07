var amqp = require('./amqp/amqp');

function MomoMQ(nodeService) {
	this.nodeService = nodeService;
	this.init();
};

MomoMQ.prototype.init = function() {
	var that = this;
	console.log('mq init');
	console.log('setting api' + Setting.api);
	this.connect();
};

MomoMQ.prototype.isAlive = function() {
	return this.connection != null && this.connection.readyState != 'closed' && this.connection.writable;
};

MomoMQ.prototype.connect = function() {
	var that = this;
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
		connection.on('error', function() {
			console.log('on connection error');
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
								exc.publish(chat.sender.id + '', JSON.stringify({kind: 'roger', data: roger}), {contentType: 'text/plain'});
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
		that.connect();
	});

	connection.addListener('end', function() {
		console.log('connection close');
		that.connect();
	});
}

MomoMQ.prototype.sendMsg = function(to, msg) {
	console.log('sending: ' + msg);
	if (this.isAlive() && this.exc != null) {
		this.exc.publish(to, msg, {contentType: 'text/plain'});
	} else {
		console.log('send msg------failed! no connection now');
	}
}

module.exports = MomoMQ;

