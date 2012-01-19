
exports.read_byte = function(buffer, position) {
	var data = Ti.Codec.decodeNumber({
		source: buffer,
		position: position || 0,
		type: Ti.Codec.TYPE_BYTE,
		byteOrder: Ti.Codec.BIG_ENDIAN
	});
	if(data < 0) { data += 256; } //2**8;
	return data;
};

exports.read_2byte = function(buffer, position) {
	var data = Ti.Codec.decodeNumber({
		source: buffer,
		position: position || 0,
		type: Ti.Codec.TYPE_SHORT,
		byteOrder: Ti.Codec.BIG_ENDIAN
	});
	if(data < 0) { data += 65536; } // 2**16
	return data;
};

exports.read_8byte = function(buffer, position) {
	var data = Ti.Codec.decodeNumber({
		source: buffer,
		position: position || 0,
		type: Ti.Codec.TYPE_LONG,
		byteOrder: Ti.Codec.BIG_ENDIAN

	});
	if(data < 0) { data += 18446744073709551616; } // 2**64
	return data;
};

exports.byte_length = function(str) {
	var buffer = Ti.createBuffer({length: 65536});
	var length = Ti.Codec.encodeString({
		source: str,
		dest: buffer
	});
	return length;
};

exports.trim = function(str) {
	return String(str).replace(/^\s+|\s+$/g, "");
};
