function DBHelper() {};

DBHelper.instance = function() {
	if (DBHelper.mInstance == null) {
		DBHelper.mInstance = new DBHelper();
	}
	return DBHelper.mInstance;
};

DBHelper.prototype = {
	create: function(onSuccess, onFailure) {
		var that = this;
		if (that.db == null) {

			var db = new Mojo.Depot({
				name: 'momo.im.app',
				version: 1,
				replace: false
			},
			function() {
				that.db = db;
				onSuccess();
			},
			function() {
				if(onFailure != null) onFailure();	
			});
		} else {
			onSuccess();
		}
	},
	get: function(key, onSuccess, onFailure) {
		var that = this;
		that.create(function() {
			that.db.get(key, function(value) {
				if (value == null) {
					onFailure()
				} else {
                    //Mojo.Log.warn("value======>" + JSON.stringify(value));
					onSuccess(value);
				}
			},
			onFailure);
		},
		onFailure);
	},
	add: function(key, value) {
		var that = this;

		that.create(function() {
			that.db.add(key, value, function() {},
			function() {});
		});
	},
	remove: function(key) {
		var that = this;

		that.create(function() {
			that.db.discard(key, function() {},
			function() {});
		});
	}
};

