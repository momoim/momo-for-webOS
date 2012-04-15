var libraries = MojoLoader.require({
	name: "foundations",
	version: "1.0"
});
var Future = libraries["foundations"].Control.Future;
var DB = libraries["foundations"].Data.DB;
var AjaxCall = libraries["foundations"].Comms.AjaxCall;
var PalmCall = libraries["foundations"].Comms.PalmCall;

var onKeepAlive = function() {};
onKeepAlive.prototype = {
	run: function(future) {
		console.log('keeping alive');
		var that = this;
		//set timeout
		this.interval = setInterval(function() {
			that.timeout(future);
		},
		6000);
	},
	timeout: function(future) {
		console.log('keeping alive timeout');
		
		PalmCall.call('palm://com.palm.applicationManager', 'open', {
			'id': 'momo.im.app.mojo',
			'params': {
				'action': 'keep-alive'
			}
		});

		clearInterval(this.interval);

		future.result = {
			alive: true
		};
	}
};

// 初始化验证信息
var onChatInit = function() {};

onChatInit.prototype = {
	run: function(future) {
		console.log('on chat init');
		NodeService.instance().auth(future, this.controller.args);
	}
};

//force restart service
var onChatForce = function() {};

onChatForce.prototype = {
	run: function(future) {
		console.log('on chat force');
		NodeService.instance().auth(future, this.controller.args, true);
	}
};

// 发送消息体
var onChatSend = function() {};

onChatSend.prototype = {
	run: function(future) {
		console.log('on chat send');
		var total = this.controller.args;
		//total.chat = JSON.parse(total.chat);
		NodeService.instance().send(future, total);
	}
};

var onChatSubscribe = function() {};

onChatSubscribe.prototype = {
	run: function(future, subscription) {
		if (subscription) {
			subscription.sname = NodeService.instance().getID();
			var count = 0;
			future.result = {
				action: 'subSuccess',
				hello: "subscribed success",
				count: 0,
				name: subscription.sname
			};
			NodeService.instance().subscribe(subscription);
		} else {
			//subscribe fail
			future.result = {
				hello: "register failed time none " + new Date()
			};
		}
	}
}

