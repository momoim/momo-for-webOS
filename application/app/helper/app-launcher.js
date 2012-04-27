var AppLauncher = {
	launch: function(action, data, onSuccess, onFailure, method) {
		var params = {
			"action": action,
			"data": data
		};
		if (!action) {
			params = null;
		}
		new Mojo.Service.Request("palm://com.palm.applicationManager", {
			method: method ? method: "open",
			parameters: {
				id: Mojo.appInfo.id,
				params: params
			},
			onSuccess: function(response) {
				if (onSuccess) {
					onSuccess(response);
				}
			},
			onFailure: function(response) {
				if (onFailure) {
					onFailure(response);
				}
			}
		});
	},
	onNewIncome: function(data, onSuccess, onFailure) {
		//have new msg
		AppLauncher.launch('onNewIncome', JSON.stringify(data), onSuccess, onFailure);
	},
	onKeepAlive: function() {
		AppLauncher.launch('keep-alive', {});
	},
	onUnreadList: function(data) {
		AppLauncher.launch('onUnreadList', data);
	},
	onDashClick: function(which) {
		AppLauncher.launch('onDashClick', which, function() {},
		function(response) {
			NotifyHelper.instance().banner(response);
		},
		'launch');
	},
	onMsgSendError: function(chat) {
		AppLauncher.launch('onMsgSendError', JSON.stringify(chat));
	}
};

