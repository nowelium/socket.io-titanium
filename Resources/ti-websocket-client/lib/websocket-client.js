var SHA1 = require('sha1').SHA1;
var Utils = require('utils');
var events = require('events');

var debug = function(str) {
  Ti.API.debug(str);
};

var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;

var BUFFER_SIZE = 65536;
var CLOSING_TIMEOUT = 1000;

var WebSocket = function(url, protocols, origin, extensions) {
  this.url = url;
  if(!this._parse_url()) {
    throw "Wrong url scheme for WebSocket: " + this.url;
  }
  
  this.origin = origin || String.format("http://%s:%s/", this._host, this._port);
  this.protocols = protocols;
  this.extensions = extensions;
  
  this.readyState = CONNECTING;
  
  this._masking_disabled = false;
  this._headers = [];
  this._pong_received = false;
  this._readBuffer = '';
  this._socketReadBuffer = undefined;
  this._closingTimer = undefined;
  this._handshake = undefined;
  
  this._socket = undefined;
  
  this._fragmentSize = BUFFER_SIZE;

  this._connect();
};
exports.WebSocket = WebSocket;
WebSocket.prototype = new events.EventEmitter();

WebSocket.prototype.onopen = function() {
  // NO OP
};

WebSocket.prototype.onmessage = function() {
  // NO OP
};

WebSocket.prototype.onerror = function() {
  // NO OP
};

WebSocket.prototype.onclose = function() {
  // NO OP
};

WebSocket.prototype._parse_url = function() {
  var parsed = this.url.match(/^([a-z]+):\/\/([\w.]+)(:(\d+)|)(.*)/i);
  if(!parsed || parsed[1] !== 'ws') {
    return false;
  }
  this._host = parsed[2];
  this._port = parsed[4] || 80;
  this._path = parsed[5];
  
  return true;
};

var make_handshake_key = function() {
  var i, key = "";
  for(i=0; i<16; ++i) {
    key += String.fromCharCode(Math.random()*255+1);
  }
  return Utils.trim(Ti.Utils.base64encode(key));
};

var make_handshake = function(host, path, origin, protocols, extensions, handshake) {
  str = "GET " + path + " HTTP/1.1\r\n";
  str += "Host: " + host + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n";
  str += "Sec-WebSocket-Key: " + handshake + "\r\n";
  str += "Origin: " + origin + "\r\n";
  str += "Sec-WebSocket-Origin: " + origin + "\r\n";
  str += "Sec-WebSocket-Version: 7\r\n";
  
  if(protocols && protocols.length > 0) {
    str += "Sec-WebSocket-Protocol: " + protocols.join(',') + "\r\n";
  }
  
  if(extensions && extensions.length > 0) {
    str += "Sec-WebSocket-Extensions: " + extensions.join(',') + "\r\n";
  }
  
  // TODO: compression
  //if @compression
  //  extensions << "deflate-application-data"
  //end  
  
  return str + "\r\n";
};

WebSocket.prototype._send_handshake = function() {
  this._handshake = make_handshake_key();
  var handshake = make_handshake(this._host, this._path, this.origin, this.protocols, this.extensions, this._handshake);
  return this._socket.write(Ti.createBuffer({ value: handshake })) > 0;
};

WebSocket.prototype._read_http_headers = function() {
  var string = "";
  var buffer = Ti.createBuffer({ length: BUFFER_SIZE });
  var counter = 10;
  while(true) {
    var bytesRead = this._socket.read(buffer);
    if(bytesRead > 0) {
      var lastStringLen = string.length;
      string += Ti.Codec.decodeString({
        source: buffer,
        charset: Ti.Codec.CHARSET_ASCII
      });
      var eoh = string.match(/\r\n\r\n/);
      if(eoh) {
        var offset = (eoh.index + 4) - lastStringLen;
        string = string.substring(0, offset-2);

        this.buffer = Ti.createBuffer({ length: BUFFER_SIZE });
        this.bufferSize = bytesRead - offset;
        this.buffer.copy(buffer, 0, offset, this.bufferSize);
        break;
      }
    }
    else {
      debug("read_http_headers: timeout");
      --counter;
      if(counter < 0) {
        return false; // Timeout
      }
    }
    buffer.clear(); // clear the buffer before the next read
  }
  buffer.clear();
  this.headers = string.split("\r\n");
  
  return true;
};

var extract_headers = function(headers) {
  var result = {};
  headers.forEach(function(line) {
    var index = line.indexOf(":");
    if(index > 0) {
      var key = Utils.trim(line.slice(0, index));
      var value = Utils.trim(line.slice(index + 1));
      result[key] = value;
    }
  });
  return result;
};

var handshake_reponse = function(handshake) {
  return (new SHA1(handshake + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")).base64digest();
};

WebSocket.prototype._check_handshake_response = function() {
  var version = this.headers.shift();
  if(version !== "HTTP/1.1 101 Switching Protocols") {
    // Mismatch protocol version
    debug("mismatch protocol version");
    return false;
  }
  var h = extract_headers(this.headers);
  if(!h.Upgrade || !h.Connection || !h['Sec-WebSocket-Accept']) {
    return false;
  }
  if(h.Upgrade.toLowerCase() !== 'websocket' || h.Connection.toLowerCase() !== 'upgrade' || h['Sec-WebSocket-Accept'] !== handshake_reponse(this._handshake)) {
    return false;
  }
  
  // TODO: compression
  // if h.has_key?('Sec-WebSocket-Extensions') and h['Sec-WebSocket-Extensions'] === 'deflate-application-data'
  //   if @compression
  //   @zout = Zlib::Deflate.new(Zlib::BEST_SPEED, Zlib::MAX_WBITS, 8, 1)
  //   @zin = Zlib::Inflate.new
  //  end    
  // else
  //   @compression = false
  // end  
  
  this.readyState = OPEN;
  return true;
};

WebSocket.prototype._create_frame = function(opcode, d, last_frame) {
  if(typeof last_frame === 'undefined') {
    last_frame = true;
  }
  
  if(last_frame === false && opcode >= 0x8 && opcode <= 0xf) {
    return false;
  }
  
  var data = d || ''; //compress(d)  // TODO
  var length = Utils.byte_length(data);
  var header_length = 2;
  var mask_size = 6;

  if(125 < length && length <= BUFFER_SIZE){
    header_length += 2;
  } else if(BUFFER_SIZE < length){
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
    type: Ti.Codec.TYPE_BYTE
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
  /*
  else if(length < BUFFER_SIZE) { // # write 2 byte length
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
  */
  else { //  # write 8 byte length
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
      var key = Math.floor(Math.random() * 255) & 0xff;
      masking_key.push(key);
      Ti.Codec.encodeNumber({
        source: key,
        dest: out,
        position: outIndex++,
        type: Ti.Codec.TYPE_BYTE
      });
    }

    var buffer = Ti.createBuffer({ value: payload });
    var string = Ti.Codec.decodeString({
      source: buffer,
      charset: Ti.Codec.CHARSET_ASCII
    });
    var length = buffer.length;

    if(out.length < length){
      out.length = length;
    }

    for(i = 0; i < length; ++i) {
      Ti.Codec.encodeNumber({
        source: string.charCodeAt(i) ^ masking_key[i % 4],
        dest: buffer,
        position: i,
        type: Ti.Codec.TYPE_BYTE
      });
    }
    out.copy(buffer, outIndex, 0, length);
    return outIndex + length;
  }

  var len = Ti.Codec.encodeString({
    source: payload,
    dest: out,
    destPosition: outIndex
  });
  return len + outIndex;
};

var parse_frame = function(buffer, size) {
  if(size < 3) {
    return undefined;
  }
  
  var byte1 = Utils.read_byte(buffer, 0);
  var fin = !!(byte1 & 0x80);
  var opcode = byte1 & 0x0f;
  
  var byte2 = Utils.read_byte(buffer, 1);
  var mask = !!(byte2 & 0x80);
  var len = byte2 & 0x7f;
  
  var offset = 2;
  switch(len) {
  case 126:
    len = Utils.read_2byte(buffer, offset);
    offset += 2;
    break;
    
  case 127:
    // too large I felt
    len = Utils.read_8byte(buffer, offset);
    offset += 8;
    break;
  }

  if(len + offset > size) {
    return undefined;
  }

  var string = Ti.Codec.decodeString({
    source: buffer,
    position: offset,
    length: len,
    charset: Ti.Codec.CHARSET_UTF8
  });
  
  return({fin: fin, opcode: opcode, payload: string, size: len + offset});
};

WebSocket.prototype.send = function(data) {
  if(data && this.readyState === OPEN) {
    var buffer = Ti.createBuffer({ value: data });
    var string = Ti.Codec.decodeString({
      source: buffer,
      charset: Ti.Codec.CHARSET_UTF8
    });

    var frame = null;
    var stringLength = string.length;
    if(stringLength < BUFFER_SIZE){
      frame = this._create_frame(0x01, string);
      if(0 < this._socket.write(frame)){
        return true;
      }
      return false;
    }

    //
    // http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07#section-4.7
    //

    var offset = 0;
    var limit = this._fragmentSize;
    var fragment = null;
    var isFirstFragment = true;
    var opcode = 0x01;
    var frames = [];

    while(offset < stringLength){
      if(stringLength < (offset + limit)){
        break;
      }

      // fragment frame
      fragment = string.substring(offset, limit - offset);

      // opcode:: fragment(0x80), text(0x01)
      opcode = 0x80;
      if(isFirstFragment){
        opcode = 0x01;
        isFirstFragment = false;
      }
      frame = this._create_frame(opcode, fragment, false);
      frames.push(frame);
      offset += limit;
    }

    // last frame
    fragment = string.substring(offset, stringLength);
    frame = this._create_frame(0x01, fragment, true);
    frames.push(frame);

    while(0 < frames.length){
      frame = frames.shift();
      if(this._socket.write(frame) < 1){
        return false;
      }
    }
    return false;
  }
  return false;
};

WebSocket.prototype._socket_close = function() {
  if(this._closingTimer) {
    clearTimeout(this._closingTimer);
  }
  this._closingTimer = undefined;

  this._readBuffer = '';
  this._socketReadBuffer = undefined;
  
  var ev;
  if(this.readyState === CLOSING) {
    this.readyState = CLOSED;
    this._socket.close();
    ev = {
      code: 1000,
      wasClean: true,
      reason: ""
    };
    this.emit("close", ev);
    this.onclose(ev);
  }
  else if(this.readyState !== CLOSED) {
    this._socket.close();
    this.readyState = CLOSED;
    ev = {
      advice: "reconnect"
    };
    this.emit("error", ev);
    this.onerror(ev);
  }
  this._socket = undefined;
};

WebSocket.prototype._read_buffer = function(callback){
  var self = this;
  var frame = parse_frame(this.buffer, this.bufferSize);
  if('undefined' === typeof frame) {
    return callback();
  }

  if(frame.size < this.bufferSize){
    var nextBuffer = Ti.createBuffer({ length: BUFFER_SIZE });
    if(this.bufferSize - frame.size > 0) {
      nextBuffer.copy(this.buffer, 0, frame.size, this.bufferSize - frame.size);
    }
    this.buffer.clear();
    this.buffer = nextBuffer;
    this.bufferSize -= frame.size;
  } else {
    this.buffer.clear();
    this.bufferSize = 0;
  }

  switch(frame.opcode){
  case 0x00: // continuation frame
  case 0x01: // text frame
  case 0x02: // binary frame
    if(frame.fin) {
      this.emit("message", {data: this._readBuffer + frame.payload});
      this.onmessage({data: this._readBuffer + frame.payload});
      this._readBuffer = '';
    }
    else {
      this._readBuffer += frame.payload;
    }
    break;
    
  case 0x08: // connection close
    if(this.readyState === CLOSING) {
      this._socket_close();
    }
    else {
      this.readyState = CLOSING;
      this._socket.write(this._create_frame(0x08));
      this._closingTimer = setTimeout(function() {
        self._socket_close();
      }, CLOSING_TIMEOUT);
    }
    break;
    
  case 0x09: // ping
    this._socket.write(this._create_frame(0x0a, frame.payload));
    break;
  
  case 0x0a: // pong
    this._pong_received = true;
    break;
  }
  return callback();
};
WebSocket.prototype._read_request = function(e, callback){
  var bytesProcessed = e.bytesProcessed;
  if('undefined' === typeof this.buffer){
    this.buffer = this._socketReadBuffer.clone();
    this.bufferSize = bytesProcessed;
  } else {
    this.buffer.copy(this._socketReadBuffer, this.bufferSize, 0, bytesProcessed);
    this.bufferSize += bytesProcessed;
    this.buffer.length += bytesProcessed;
    this._socketReadBuffer.clear();
  }

  return this._read_buffer(callback);
};
WebSocket.prototype._read_callback = function(e){
  var self = this;
  var streamReadCallback = function(evt){
    if(0 < evt.bytesProcessed){
      return self._read_request(evt, function (){
        return setTimeout(nextTick, 0);
      });
    }
    return setTimeout(nextTick, 100);
  };
  var nextTick = function(){
    if(0 < self.bufferSize){
      return self._read_buffer(function (readSuccess){
        if(readSuccess){
          return setTimeout(nextTick, 0);
        }

        self._socketReadBuffer.clear();
        return Ti.Stream.read(self._socket, self._socketReadBuffer, streamReadCallback);
      });
    }

    if(null == self._socket){
      // on_socket_close occured
      return ;
    }

    self._socketReadBuffer.clear();
    return Ti.Stream.read(self._socket, self._socketReadBuffer, streamReadCallback);
  };
  return setTimeout(nextTick, 0);
};

WebSocket.prototype._error = function(code, reason) {
  if(this.buffer) {
    this.buffer.clear();
  }
  this.buffer = undefined;
  this.bufferSize = 0;

  this.readyState = CLOSED;
  if(this._socket) {
    try {
      this._socket.close();
    }
    catch(e) { }
    this._socket = undefined;
  }
  var ev = {
    wasClean: true,
    code: ('undefined' === typeof code) ? 1000 : code,
    advice: "reconnect",
    reason: reason
  };
  this.emit("error", ev);
  this.onerror(ev);
};

WebSocket.prototype._raise_protocol_error = function(reason) {
  this._error(1002, reason);
};

WebSocket.prototype.close = function(code, message) {
  if(this.readyState === OPEN) {
    this.readyState = CLOSING;
    
    var buffer = Ti.createBuffer({ length: BUFFER_SIZE });
    
    Ti.Codec.encodeNumber({
      source: code || 1000,
      dest: buffer,
      position: 0,
      type: Ti.Codec.TYPE_SHORT,
      byteOrder: Ti.Codec.BIG_ENDIAN
    });
    
    if(message) {
      var length = Ti.Codec.encodeString({
        source: message,
        dest: buffer,
        destPosition: 2
      });
      buffer.length = 2 + length;
    }
    else {
      buffer.length = 2;
    }
    
    var payload = Ti.Codec.decodeString({
      source: buffer,
      charset: Ti.Codec.CHARSET_ASCII
    });
    this._socket.write(this._create_frame(0x08, payload));
    
    var self = this;
    this._closingTimer = setTimeout(function() {
      self._socket_close();
    }, CLOSING_TIMEOUT);
  }
};

WebSocket.prototype._connect = function() {
  if(this.readyState === OPEN || this.readyState === CLOSING) {
    return false;
  }

  var self = this;
  this._socket = Ti.Network.Socket.createTCP({
    host: this._host,
    port: this._port,
    mode: Ti.Network.READ_WRITE_MODE,
    connected: function(e) {
      var result;
      result = self._send_handshake();
      if(!result) {
        return self._raise_protocol_error("send handshake");
      }
      
      result = self._read_http_headers();
      if(!result) {
        return self._raise_protocol_error("parse http header");
      }
      
      result = self._check_handshake_response();
      if(!result) {
        return self._raise_protocol_error("wrong handshake");
      }
      
      self._readBuffer = '';
      self._socketReadBuffer = Ti.createBuffer({ length: BUFFER_SIZE });
      
      self.readyState = OPEN;
      self.emit("open");
      self.onopen();
      
      self._read_callback();
    },
    closed: function() {
      self._socket_close();
      if(self.buffer) {
        self.buffer.clear();
      }
      self.buffer = undefined;
      self.bufferSize = 0;
    },
    error: function(e) {
      var reason;
      if('undefined' !== typeof e) {
        reason = e.error;
      }
      self._error(1000, reason);
    }
  });
  this._socket.connect();
};
