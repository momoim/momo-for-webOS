function RabbitDB() {
	var that = this;
	that.db = openDatabase("momo.sqlite", "1.0", "momo", 200000);
	if (that.db == null) {
		Mojo.Log.info('sqlite create fail');
	} else {
		Mojo.Log.info('sqlite create successful');
		that.createTables();
	}
};

RabbitDB.table = {
	user: 'momo_user',
	talk: 'momo_talk'
};

RabbitDB.sql = {
	user: {
		create: 'CREATE TABLE IF NOT EXISTS ' + RabbitDB.table.user + '(id INT(64) NOT NULL PRIMARY KEY,name VARCHAR(30),avatar VARCHAR(200));',
		index: ''
	},
	talk: {
		create: 'CREATE TABLE IF NOT EXISTS ' + RabbitDB.table.talk + '(row_id INTEGER PRIMARY KEY AUTOINCREMENT,id VARCHAR(36) NOT NULL UNIQUE,user_id INT(64) NOT NULL,other_id INT(64) NOT NULL,content VARCHAR(1024),client_id INTEGER,timestamp INTEGER DEFAULT (0),state INTEGER);',
		index: ''
	}
};

RabbitDB.instance = function() {
	if (RabbitDB.mInstance == null) {
		RabbitDB.mInstance = new RabbitDB();
	}
	return RabbitDB.mInstance;
};

RabbitDB.prototype = {
	createTable: function(sql) {
		var that = this;
		that.db.transaction(function(transaction) {
			transaction.executeSql(sql, [], // array of substitution values (if you were inserting, for example)
			function(transaction, results) {
				Mojo.Log.info("Successfully created table" + sql);
			},
			function(transaction, error) {
				Mojo.Log.error("Could not create table: " + error.message);
			});
		});
	},
	createTables: function() {
		var that = this;
		//talk history
		that.createTable(RabbitDB.sql.talk.create);
	},
	addTalk: function(talk) {
		//
	},
	getTalk: function(id) {
		//
	},
	getConvList: function() {
		//
	},
	getTalkList: function() {
		//
	}
};

