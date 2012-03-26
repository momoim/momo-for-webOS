var AppFormatter = {
	time: function(time, model) {
		return AppFormatter.timeSince(parseInt(time) * 1000);
	},
	timeSince: function(time) {
		//using a modified Date function in vendors/date.js
		var d = new Date(time);
		return d.toRelativeTime(1500);
	},
	location: function(n, model) {
		if (n) return n['name'];
		else return '';
	},
	user: function(n, model) {
		return '';
	},
	sender: function(sender, model) {
		if (!sender) return '';
		if (sender['id'] != model['other']['id']) {
			return "is-said";
		} else {
			return "other-said";
		}
	},
	content: function(n, model) {
		for (var now in n) {
			//Mojo.Log.info('content now: ' + now);
			if (now == 'text' || now == 'text_long') {
				return AppFormatter.htmlSafe(n[now]);
			} else {
				var base = '发送了';
				if (now == 'picture') {
					return base + '一张照片';
				} else if (now == 'audio') {
					return base + '一段录音';
				} else if (now == 'location') {
					return base + '地理位置';
				} else if (now == 'file') {
					return base + '一个文件';
				}
			}
		}
		return '未支持的类型';
	},
	htmlSafe: function(what) {
		// FIXME: try this out: 
		// http://stackoverflow.com/questions/3066574/converting-html-to-its-safe-entities-with-javascript
		var htmling = what;
		htmling = htmling.replace(/>/g, '&gt;');
		htmling = htmling.replace(/</g, '&lt;');
		return htmling;
	},
	contentDetail: function(n, model) {
		for (var now in n) {
			//Mojo.Log.info('content now: ' + now);
			if (now == 'text' || now == 'text_long') {
				return linkify(AppFormatter.htmlSafe(n[now]));
			} else if (now == 'picture') {
				var pUrl = n[now]['url'];
				if (!pUrl) {
					return '发送了错误的照片数据';
				}
				var regex = /_\d{2,4}.jpg/g;
				var orig = pUrl.replace(regex, '.jpg');
				return '<a href="' + orig + '"><img src="' + pUrl + '"/></a>';
			} else if (now == 'location') {
				var location = n[now];
				var latlng = location['latitude'] + ',' + location['longitude'];
				var gmap = "http://maps.googleapis.com/maps/api/staticmap?center=" + latlng + "&markers=color:blue|" + latlng + "&zoom=16&size=" + 200 + "x" + 120 + "&sensor=false";
				return '<img src="' + gmap + '"/>';
			} else if (now == 'audio') {
				var audio = n[now];
				//preload="auto"
				return '<img src="images/audio.png" width="72px;" data-action="chat-audio" data-id="' + model['id'] + '" audio-src="' + audio['url'] + '"/>';
				//+ '<audio src="'+ audio['url'] +'" id="audio-' + model['id'] + '"/>';
			} else if (now == 'file') {
				var file = n[now];
				return '<a href="' + file.url + '">' + file.name + '</a>';
			} else {
				var base = '发送了';
				if (now == 'picture') {
					return base + '一张照片';
				}
				else if (now == 'audio') {
					return base + '一段录音';
				}
				else if (now == 'location') {
					return base + '地理位置';
				}
				else if (now == 'file') {
					return base + '一个文件';
				}
			}
		}
		return '未支持的类型';
	}
};
