var PluginHelper = {
	inited: false,
	createPluginAmr: function(document) {
		var pluginObj = document.createElement("object");

		pluginObj.id = "amr_helper";
		pluginObj.type = "application/x-palm-remote";
		pluginObj.width = 2;
		pluginObj.height = 2;
		pluginObj['x-palm-pass-event'] = true;

		var param1 = document.createElement("param");
		param1.name = "appid";
		param1.value = Mojo.Controller.appInfo.id;

		var param2 = document.createElement("param");
		param2.name = "exe";
		param2.value = "amr_helper";

		pluginObj.appendChild(param1);
		pluginObj.appendChild(param2);

		document.body.appendChild(pluginObj);

		//make it global
		Global.AmrHelper = pluginObj;

		if (Global.AmrHelper) {
			Global.AmrHelper.ready = function() {
				//NotifyHelper.instance().banner('well');
				Global.AmrHelper.isReady = true;
			};
			//whether to init plugin for opensocket or not
			var version = Mojo.Environment.DeviceInfo.platformVersionMajor;
			Mojo.Log.error('majon version of device: ' + version);
			if (version < 2) {
				PluginHelper.initializePlugin();
			}
		} else {
			NotifyHelper.instance().banner('fail to load amr helper');
		}
	},
	initializePlugin: function() {
		if (PluginHelper.initTimer) {
			clearTimeout(PluginHelper.initTimer);
		}
		if (!Global.AmrHelper.foo) {
			PluginHelper.initTimer = setTimeout(PluginHelper.initializePlugin, 50);
		} else {
			//register callbacks
			Global.AmrHelper.onProxyMsg = function(body, timestamp) {
				var msg = JSON.parse(body);
				if (msg.kind !== 'sms') {
					return;
				}
				msg.data.timestamp = parseInt(timestamp);
				Mojo.Log.error('on plugin msg: ' + body + ' ..' + timestamp);
				//call by launch
				AppLauncher.onNewIncome(msg);
			};

			// plug-in is ready to be used
			/*
			var foo = Global.AmrHelper.foo();
			NotifyHelper.instance().banner(foo);
			*/
			//Global.AmrHelper.wave2amr("/media/internal/.momo/audio/74eaa851-db2c-03fe-fed1-15f9a2df49dc.amr", "/media/internal/.momo/testmojo.amr");
			var auth = {
				"login_type": "token",
				"data": {
					"token": Global.authInfo.oauthToken
				},
				"heartbeat": 60,
				//TODO "compress": "gzip",
				"receive_audio": true,
				"version": "1.1.1"
			};
			//Global.AmrHelper.openSocket(Setting.proxy, 9191, JSON.stringify(auth));
			//Global.AmrHelper.openSocket('58.22.103.41', 9191, JSON.stringify(auth));
			//Global.AmrHelper.openSocket('121.207.242.119', 9191, JSON.stringify(auth));
			Global.AmrHelper.openSocket('proxy.momo.im', 9191, JSON.stringify(auth));
		}
	},
};
