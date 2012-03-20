function StageAssistant() {}

StageAssistant.prototype = {
	setup: function() {},
	showScene: function(directory, sceneName, arguments) {
		console.log(this.TAG + 'showScene' + sceneName);
		if (arguments === undefined) {
			this.controller.pushScene({
				name: sceneName,
				sceneTemplate: directory + "/" + sceneName + "-scene"
			});
		}
		else {
			this.controller.pushScene({
				name: sceneName,
				sceneTemplate: directory + "/" + sceneName + "-scene"
			},
			arguments);
		}
	}

};

