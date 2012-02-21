var platform = {
  isAndroid: /android/i.test(Titanium.Platform.osname),
  isIPhone: /iphone/i.test(Titanium.Platform.osname),
  os: function(obj){
    if(platform.isIPhone){
      return obj.iphone();
    }
    if(platform.isAndroid){
      return obj.android();
    }
    return obj.otherwise();
  }
};

var global = this;
var io = this.io = global.io = {};
io.version = '0.8.7';
io.protocol = 1;
io.transports = [];
io.j = [];
io.sockets = {};

//
// titanium mobile 1.8.0.1 CommonJS compat for ios,android
//
platform.os({
  iphone: function (){
    require('socket.io/lib/util');
    require('socket.io/lib/json');

    require('socket.io/lib/parser');
    require('socket.io/lib/events');
    require('socket.io/lib/namespace');
    require('socket.io/lib/transport');

    require('socket.io/lib/transports/websocket');
    require('socket.io/lib/transports/xhr');
    require('socket.io/lib/transports/xhr-polling');

    require('socket.io/lib/socket');
  },
  android: function (){
    // "require" wrongly global scope handling
    Titanium.include(
      'socket.io/lib/util.js',
      'socket.io/lib/json.js',
      'socket.io/lib/parser.js',
      'socket.io/lib/events.js',
      'socket.io/lib/namespace.js',
      'socket.io/lib/transport.js',
      'socket.io/lib/transports/xhr.js',
      'socket.io/lib/transports/websocket.js',
      'socket.io/lib/transports/xhr-polling.js',
      'socket.io/lib/socket.js'
    );
  }
});

// {{{ @lib/transports/ws
// titanium-websocket-client :: https://github.com/masuidrive/ti-websocket-client
var WebSocket = require('ti-websocket-client/ti-websocket-client').WebSocket;
WebSocket.BUFFER_SIZE = 65536;
WebSocket.Utils = {
  byte_length: function(str){
    var buffer = Ti.createBuffer({ length: WebSocket.BUFFER_SIZE });
    return Ti.Codec.encodeString({
      source: str,
      dest: buffer
    });
  }
};
WebSocket.readyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};
WebSocket.prototype._create_frame = function(opcode, d, last_frame) {
	if(typeof last_frame === 'undefined') {
		last_frame = true;
	}
	
	if(last_frame === false && opcode >= 0x8 && opcode <= 0xf) {
		return false;
  }

	var data = d || ''; //compress(d)	// TODO
  var length = WebSocket.Utils.byte_length(data);
  var header_length = 2;
  var mask_size = 6;

  if(125 < length && length <= WebSocket.BUFFER_SIZE){
    header_length += 2;
  } else if(WebSocket.BUFFER_SIZE < length){
    header_length += 8;
  }

  if(!this._masking_disabled){
    header_length += 4;
  }
	
	// apply per frame compression
	var out = Ti.createBuffer({ length: length + header_length + mask_size });
	var outIndex = 0;
	
	var byte1 = opcode;
	if(last_frame) { 
		byte1 = byte1 | 0x80;
	}

	Ti.Codec.encodeNumber({
		source: byte1,
		dest: out,
		position: outIndex++,
		type: Ti.Codec.TYPE_BYTE,
	});
	
	if(length <= 125) {
		var byte2 = length;
		if(!this._masking_disabled) {
			byte2 = (byte2 | 0x80); // # set masking bit
		}
		Ti.Codec.encodeNumber({
			source: byte2,
			dest: out,
			position: outIndex++,
			type: Ti.Codec.TYPE_BYTE
		});
  }
  else if(length < WebSocket.BUFFER_SIZE) { // # write 2 byte length
		Ti.Codec.encodeNumber({
			source: (126 | 0x80),
			dest: out,
			position: outIndex++,
			type: Ti.Codec.TYPE_BYTE
		});
		Ti.Codec.encodeNumber({
			source: length,
			dest: out,
			position: outIndex++,
			type: Ti.Codec.TYPE_SHORT,
			byteOrder: Ti.Codec.BIG_ENDIAN
		});
		outIndex += 2;
  }
  else { //	# write 8 byte length
		Ti.Codec.encodeNumber({
			source: (127 | 0x80),
			dest: out,
			position: outIndex++,
			type: Ti.Codec.TYPE_BYTE
		});
		Ti.Codec.encodeNumber({
			source: length,
			dest: out,
			position: outIndex,
			type: Ti.Codec.TYPE_LONG,
			byteOrder: Ti.Codec.BIG_ENDIAN
		});
    outIndex += 8;
	}

	//# mask data
	outIndex = this._mask_payload(out, outIndex, data);
	out.length = outIndex;
	
	return out;
};

WebSocket.prototype._mask_payload = function(out, outIndex, payload) {
	if(!this._masking_disabled) {
		var i, masking_key = [];
		for(i = 0; i < 4; ++i) {
			var key = Math.floor(Math.random()*255) & 0xff;
			masking_key.push(key);
			Ti.Codec.encodeNumber({
				source: key,
				dest: out,
				position: outIndex++,
				type: Ti.Codec.TYPE_BYTE
			});
		}
		
		var buffer = Ti.createBuffer({ length: WebSocket.BUFFER_SIZE });
		var length = Ti.Codec.encodeString({
			source: payload,
			dest: buffer
		});
    buffer.length = length;
		
		var string = Ti.Codec.decodeString({
			source: buffer,
			charset: Ti.Codec.CHARSET_ASCII
    });
    
    if(out.length < length){
  	  out.length = string.length;
    }

		for(i = 0; i < string.length; ++i) {
			Ti.Codec.encodeNumber({
				source: string.charCodeAt(i) ^ masking_key[i % 4],
				dest: out,
				position: outIndex++,
				type: Ti.Codec.TYPE_BYTE
			});
		}
		return outIndex;
	}
	else {
		var len = Ti.Codec.encodeString({
			source: payload,
			dest: out,
			destPosition: outIndex
		});
		return len + outIndex;
	}
};
WebSocket.prototype.send = function(data) {
  if(data && this.readyState === WebSocket.readyState.OPEN) {
    var buffer = Ti.createBuffer({ value: data });
		var string = Ti.Codec.decodeString({
			source: buffer,
			charset: Ti.Codec.CHARSET_ASCII
    });
    var stringLength = string.length;
    if(stringLength < WebSocket.BUFFER_SIZE){
      var frame = this._create_frame(0x01, string);
      var bytesWritten = this._socket.write(frame);
      return 0 < bytesWritten;
    }

    // 
    // fragment message
    // http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07#section-4.7
    //
    var isFirstFragment = true;
    var offset = 0;
    while(offset < stringLength){
      if(stringLength < (offset + WebSocket.BUFFER_SIZE)){
        break;
      }

      fragment = string.substring(offset, WebSocket.BUFFER_SIZE);
      if(fragment.length < 1){
        return true;
      }

      // opcode:: fragment(0x80), text(0x01)
      var opcode = 0x80;
      if(isFirstFragment){
        opcode = 0x01;
        isFirstFragment = false;
      }

      frame = this._create_frame(opcode, fragment, false);
      if(this._socket.write(frame) < 1){
        return false;
      }
      offset += WebSocket.BUFFER_SIZE;
    }
    fragment = string.substring(offset, stringLength);
    if(fragment.length < 1){
      return true;
    }

    // last frame
    frame = this._create_frame(0x80, fragment, true);
    if(this._socket.write(frame) < 1){
      return false;
    }
    return true;
	}
	else {
		return false;
	}
};
io.Transport.websocket.prototype.open = function (){
  var query = io.util.query(this.socket.options.query)
    , self = this
    , Socket;

  var Socket = WebSocket;

  this.websocket = new Socket(this.prepareUrl() + query);

  this.websocket.onopen = function () {
    self.onOpen();
    self.socket.setBuffer(false);
  };
  this.websocket.onmessage = function (ev) {
    self.onData(ev.data);
  };
  this.websocket.onclose = function () {
    self.onClose();
    self.socket.setBuffer(true);
  };
  this.websocket.onerror = function (e) {
    self.onError(e);
  };

  return this;
};
// }}} @lib/transports/ws

// {{{ @lib/socket.js
io.Socket.prototype.isXDomain = function (){
  return false;
};
// }}} @lib/socket.js

// {{{ @lib/util.js
io.util.request = function (){
  return Titanium.Network.createHTTPClient();
};
io.connect = function (host, details) {
  var uri = io.util.parseUri(host)
    , uuri
    , socket;

  if (global && global.location) {
    uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
    uri.host = uri.host || (global.document
      ? global.document.domain : global.location.hostname);
    uri.port = uri.port || global.location.port;
  }

  uuri = io.util.uniqueUri(uri);

  var options = {
      host: uri.host
    , secure: 'https' == uri.protocol
    , port: uri.port || ('https' == uri.protocol ? 443 : 80)
    , query: uri.query || ''
  };

  io.util.merge(options, details);

  if (options['force new connection'] || !io.sockets[uuri]) {
    socket = new io.Socket(options);
  }

  if (!options['force new connection'] && socket) {
    io.sockets[uuri] = socket;
  }

  socket = socket || io.sockets[uuri];

  // if path is different from '' or /
  return socket.of(uri.path.length > 1 ? uri.path : '');
};
// }}} @lib/util.js

exports.io = io;
exports.connect = function (){
  return io.connect.apply(io, arguments);
};
