var onFileDel = function() {};
onFileDel.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path = this.controller.args.path;

		fs.unlink(path, function(err) {
			future.result = {
				path: path,
				error: err
			};
		});
	}
};

var onFileInfo = function() {};
onFileInfo.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path = this.controller.args.path;

		fs.stat(path, function(err, stats) {
			future.result = {
				path: path,
				stats: stats,
				error: err
			};
		});
	}
};

var onFileDownload = function() {};
onFileDownload.prototype = {
	run: function(future) {
		var http = IMPORTS.require('http');
		var fs = IMPORTS.require('fs');
		var url = IMPORTS.require('url'); 
		var path = IMPORTS.require('path');

		var filePath = this.controller.args.path;
		var fileUrl = this.controller.args.url;

		fs.mkdir(Setting.CACHE_FOLDER, 0755);
		fs.mkdir(Setting.cache.audio, 0755);
		fs.mkdir(Setting.cache.photo, 0755);

		var host = url.parse(fileUrl).hostname;

		var httpClient = http.createClient(80, host);

		var request = httpClient.request('GET', fileUrl, {
			"host": host
		});
		request.end();

		request.on('response', function(response) {
			var downloadfile = fs.createWriteStream(filePath, {
				'flags': 'a'
			});
			response.on('data', function(chunk) {
				downloadfile.write(chunk, encoding='binary');
			});
			response.on('end', function() {
				downloadfile.end();
				future.result = {
					path: filePath,
					url: fileUrl
				};
			});
		});
	}
};

var onFileRename = function() {};
onFileRename.prototype = {
	run: function(future) {
		var fs = IMPORTS.require('fs');
		var path1 = this.controller.args.path1;
		var path2 = this.controller.args.path2;

		fs.rename(path1, path2, function(err) {
			future.result = {
				path1: path1,
				path2: path2,
				error: err
			};
		});
	}
};

