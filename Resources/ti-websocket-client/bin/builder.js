/**
 * Titanium WebSocket Client
 *
 * http://github.com/masuidrive/ti-websocket-client
 * 
 * Copyright 2011 Yuichiro MASUI <masui@masuidrive.jp>
 * MIT License
 */

var LIB_DIR = __dirname + '/../lib/';

var fs = require('fs');

var extract_require = function(filename) {
	var content = fs.readFileSync(LIB_DIR + filename + '.js', 'utf8');
	return content.replace(/require\s*\(\s*['"]{1}(.*?)['"]{1}\s*\)/g, function(full, fname) {
		var exports = extract_require(fname);
		return "(function(){var exports={};" + exports + "return exports;}())"
	});
};

fs.write(
	fs.openSync(__dirname + '/../ti-websocket-client.js', 'w')
	, extract_require('websocket-client')
	, 0
	, 'utf8'
);

console.log('Successfully generated the build: ti-websocket-client.js');
