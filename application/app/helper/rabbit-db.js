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

RabbitDB.state = {
	income: 0,
	sending: 4,
	sent: 2
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
		create: 'CREATE TABLE IF NOT EXISTS ' + RabbitDB.table.talk + '(row_id INTEGER PRIMARY KEY AUTOINCREMENT,id VARCHAR(36) NOT NULL UNIQUE,user_id INT(64) NOT NULL,other_id INT(64) NOT NULL, other VARCHAR(64), content VARCHAR(1024),client_id INTEGER,timestamp INTEGER DEFAULT (0),state INTEGER);',
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
	trans: function(onTrans) {
		this.db.transaction(function(tx) {
			onTrans(tx);
		});
	},
	createTable: function(sql) {
		var that = this;
		that.db.transaction(function(transaction) {
			transaction.executeSql(sql, [], 
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
		this.db.transaction(function(tx) {
			var uid = Global.authInfo.user.id;
			var isOut = (uid == talk.sender.id);
			var other = (isOut ? talk.receiver[0] : talk.sender);
			var oid = other.id;
			if(!talk.state) {
				talk.state = (isOut ? RabbitDB.state.sent : RabbitDB.state.income);
			}
			if(talk.state == RabbitDB.state.sending) {
				//current time
				talk.timestamp = (new Date().getTime()/1000);
			}
			tx.executeSql('INSERT OR REPLACE INTO ' + RabbitDB.table.talk + ' (id, user_id, other_id, other, content, client_id, timestamp, state) values(?,?,?,?,?,?,?,?)', [talk.id, uid, oid, JSON.stringify(other), JSON.stringify(talk.content), talk.client_id, talk.timestamp, talk.state], 
			function() {
				Mojo.Log.info('addTalk success------------------' + talk.timestamp);
			},
			function(tx, e) {
				Mojo.Log.error('addTalk fail------------------' + e.message);
			});
		});

	},
	getTalk: function(id) {
		//
	},
	deleteConv: function(who) {
		this.trans(function(tx) {
			tx.executeSql(
				'DELETE FROM ' + RabbitDB.table.talk + ' WHERE other_id = ' + who,
				[],
				function(tx, rs) {
					Mojo.Log.info('conversation ' + who + ' deleted');
				},
				function(tx, e) {
					Mojo.Log.info('conversation delete failed' + e.message);
				}
			);
		});
	},
	deleteMsg: function(which) {
		this.trans(function(tx) {
			tx.executeSql(
				'DELETE FROM ' + RabbitDB.table.talk + " WHERE id = '" + which + "'",
				[],
				function(tx, rs) {
					Mojo.Log.info('Message ' + which + ' deleted');
				},
				function(tx, e) {
					Mojo.Log.error('Message delete failed' + e.message);
				}
			);
		});
	},
	getConvList: function(onResult) {
		this.trans(function(tx) {
			tx.executeSql(
				'SELECT * FROM (SELECT * FROM ' + RabbitDB.table.talk + ' WHERE  user_id = ' + Global.authInfo.user.id + ' GROUP BY other_id) ORDER BY timestamp DESC',
				[],
				function(tx, rs) {
					Mojo.Log.info('getConvList, count: ' + rs.rows.length);
					if(onResult != null) {
						var result = [];
						for(var i = 0; i < rs.rows.length; ++i) {
							var row = rs.rows.item(i);
							var isOut = (row.state == RabbitDB.state.sent || row.state == RabbitDB.state.sending);

							var item = {};
							item.id = row.id;
							item.client_id = row.client_id;
							item.timestamp = row.timestamp;
							item.state = row.state;
							item.content = JSON.parse(row.content);
							item.other = JSON.parse(row.other);
							if(isOut) {
								item.sender = Global.authInfo.user;
								item.receiver = [item.other];
							} else {
								item.receiver = [Global.authInfo.user];
								item.sender = item.other;
							}
							result.push(item);
						}
						Mojo.Log.info('result json-----: ' + JSON.stringify(result));
						onResult(result);
					}
				},
				function(tx, e) {
					Mojo.Log.info('getConvList failed' + e.message);
				}
			);
		});
	},
	getTalkList: function(otherID, onResult) {
		this.trans(function(tx) {
			tx.executeSql(
				'SELECT * FROM ' + RabbitDB.table.talk + ' WHERE user_id = ' + Global.authInfo.user.id + ' AND other_id = ' + otherID + ' LIMIT 50',
				[],
				function(tx, rs) {
					Mojo.Log.info('getTalkList, count: ' + rs.rows.length);
					if(onResult != null) {
						var result = [];
						for(var i = 0; i < rs.rows.length; ++i) {
							var row = rs.rows.item(i);
							var isOut = (row.state == RabbitDB.state.sent || row.state == RabbitDB.state.sending);

							var item = {};
							item.id = row.id;
							item.client_id = row.client_id;
							item.timestamp = row.timestamp;
							item.state = row.state;
							item.content = JSON.parse(row.content);
							item.other = JSON.parse(row.other);
							if(isOut) {
								item.sender = Global.authInfo.user;
								item.receiver = [item.other];
							} else {
								item.receiver = [Global.authInfo.user];
								item.sender = item.other;
							}
							result.push(item);
						}
						Mojo.Log.info('result json-----: ' + JSON.stringify(result));
						onResult(result);
					}
				},
				function() {
					Mojo.Log.info('getTalkList failed');
				}
			);
		});
	}
};

