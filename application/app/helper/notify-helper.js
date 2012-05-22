var NotifyHelper = function() {
	return {
		banner: function(msg, silence) {
			var bannerParams = {
				messageText: msg,
				soundClass: silence ? '' : 'notifications'
			};

			Mojo.Controller.getAppController().showBanner(bannerParams, {
				source: "notification"
			},
			'momo');
		},
		bannerNewMsg: function() {
			var now = new Date();
			var duntAlert = NotifyHelper.lastAlertTime && (now.getTime() - NotifyHelper.lastAlertTime.getTime() < 3000);
			if(!duntAlert) {
				this.banner('You just got new message.', !Global.alertSound());
				NotifyHelper.lastAlertTime = now;
			}
		}
	}
};

NotifyHelper.instance = function() {
	if(!NotifyHelper.mInstance) {
		NotifyHelper.mInstance = new NotifyHelper();
	}
	return NotifyHelper.mInstance;
}
