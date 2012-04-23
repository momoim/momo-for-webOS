var AppLauncher = {
	launch: function(action, data, onSuccess, onFailure) {
		new Mojo.Service.Request("palm://com.palm.applicationManager", {
			method: "open",
			parameters: {
				id: Mojo.appInfo.id,
				params: {
					"action": action,
					"data": data
				}
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
	onDashClick: function(which, appController) {
		AppLauncher.launch('onDashClick', which, function() {
			appController.closeStage(Global.dashStage);
		},
		function(response) {
			NotifyHelper.instance().banner(response);
		});
	}
};

