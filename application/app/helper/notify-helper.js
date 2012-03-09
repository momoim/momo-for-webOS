var NotifyHelper = function() {
	return {
		banner: function(msg) {
			var bannerParams = {
				messageText: msg,
				soundClass: 'notifications'
			};

			Mojo.Controller.getAppController().showBanner(bannerParams, {
				source: "notification"
			},
			'momo');
		},
		bannerNewMsg: function() {
			this.banner('You just got new message.');
		}
	}
};

NotifyHelper.instance = function() {
	if(!NotifyHelper.mInstance) {
		NotifyHelper.mInstance = new NotifyHelper();
	}
	return NotifyHelper.mInstance;
}
