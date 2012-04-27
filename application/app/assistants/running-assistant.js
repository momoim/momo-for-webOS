function RunningAssistant() {};

RunningAssistant.prototype = {
	setup: function() {
		PluginHelper.createPluginAmr(this.controller.document);
		this.onClickReal = this.onClick.bind(this);
	},
	killSelf: function() {
		this.controller.window.close();
	},
	onClick: function() {
		AppLauncher.launch();
	},
	activate: function() {
		this.controller.document.addEventListener("click", this.onClickReal, true);
	},
	deactivate: function(event) {
		this.controller.document.removeEventListener("click", this.onClickReal, true);
	},
	cleanup: function() {}
};

