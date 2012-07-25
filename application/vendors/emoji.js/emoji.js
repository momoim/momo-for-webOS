if(!console || !console.log) {
	console = {
		log: function() {}
	};
}
var ioNull = {
	emoji: function() {
		function Emoji() {
			this.init();
		};
		Emoji.prototype = {
			init: function() {
				console.log('init');
				//init map
				this.map();
			},
			parse: function(what) {
				var unicodes;
				if (what) {
					unicodes = punycode.ucs2.decode(what);
				} else {
					return '';
				}
				console.log(unicodes.length);
				var unicodeString = '';
				var kinds = this.map();
				for (var now = 0; now < unicodes.length;) {
					var unicode = unicodes[now];
					var isEmoji = false;
					var isEmojiUnicode = false;
					if (unicode >= 0xE000 && unicode < 0xE538) {
						unicodeString = unicode.toString(16);
						console.log('it is emoji: ' + unicode + punycode.ucs2.encode([unicode]) + ' : ' + unicodeString);
						//replace with img directly
						isEmoji = true;
					} else if ((unicode >= 0x2600 && unicode <= 0x3299) || (unicode >= 0x1f000 && unicode <= 0x1f700)) {
						unicodeString = unicode.toString(16);
						console.log('it is unicode 6 emoji: ' + unicode + punycode.ucs2.encode([unicode]) + ' : ' + unicodeString);
						//we need to find out what is mapped
						isEmoji = true;
						isEmojiUnicode = true;
					} else {
						console.log('it is not emoji' + unicode);
					}

					if (isEmoji) {
						for (var i = 0; i < kinds.length; ++i) {
							var kind = kinds[i];
							for (var j = 0; j < kind.length; ++j) {
								var emo = kind[j];
								var found = false;
								if (isEmojiUnicode && emo[1] == unicodeString) {
									found = true;
								} else if (!isEmojiUnicode && emo[0] == unicodeString) {
									found = true;
								}

								if (found) {
									var img = new Image();
									//img.src = 'emojis/' + emo[0] + '.png';
									console.log('emojis string is: ' + emo[0]);
var data = 'data:image/png;base64,'+
    emo[2];
									img.src = data;
									var html = img.outerHTML;
									console.log('img is: ' + html);
									//remove old text, add html string
									var puny = punycode.ucs2.decode(html);
									console.log('puny length: ' + puny.length);
									unicodes.splice(now, 1);
									for (var curr = 0; curr < puny.length; ++curr) {
										unicodes.splice(now, 0, puny[curr]); ++now;
									}--now;
									console.log('unicodes length: ' + unicodes.length);
								}
							}
						}
					}++now;
				}
				console.log('unicodes length: ' + unicodes.length);
				var html = punycode.ucs2.encode(unicodes);
				return html;
			},
			map: function() {
				if (!Emoji.list) {
					Emoji.list = getEmojiList();
				}
				return Emoji.list;
			},
			image: function() {
				if (!Emoji.images) {
					Emoji.images = getEmojiImage();
				}
				return Emoji.images;
			}
		};
		return new Emoji();
	}
}

ioNull.emoji = ioNull.emoji();
