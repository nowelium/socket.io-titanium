var SHA1 = (function(){var exports={};/*
 * Modified by Yuichiro MASUI <masui@masuidrive.jp>
 * Tested on nodejs and Titanium Mobile
 * 
 * The JavaScript implementation of the Secure Hash Algorithm 1
 *
 *   Copyright (c) 2008  Takanori Ishikawa  <takanori.ishikawa@gmail.com>
 *   All rights reserved.
 *
 *   Redistribution and use in source and binary forms, with or without
 *   modification, are permitted provided that the following conditions
 *   are met:
 * 
 *   1. Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *
 *   3. Neither the name of the authors nor the names of its contributors
 *      may be used to endorse or promote products derived from this
 *      software without specific prior written permission.
 *
 *   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 *   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 *   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 *   A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 *   OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 *   SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *   TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * This is the javascript file for code which implements
 * the Secure Hash Algorithm 1 as defined in FIPS 180-1 published April 17, 1995.
 *
 *   Author: Takanori Ishikawa <takanori.ishikawa@gmail.com>
 *   Copyright: Takanori Ishikawa 2008
 *   License: BSD License (see above)
 *
 * NOTE:
 *   Only 8-bit string is supported, please use encodeURIComponent() function 
 *   if you want to hash multibyte string.
 *
 * Supported Browsers:
 *   [Win] IE 6, Firefox 2
 *   [Mac] Safari 3, Firefox 2
 *
 * Usage:
 *   var hexdigest = new SHA1("Hello.").hexdigest(); // "9b56d519ccd9e1e5b2a725e186184cdc68de0731"
 *
 * See Also:
 *   FIPS 180-1 - Secure Hash Standard
 *   http://www.itl.nist.gov/fipspubs/fip180-1.htm
 *
 */

var SHA1 = (function(){

  /**
   * Spec is the BDD style test utilities.
   */
  var Spec;
  Spec = {
    /** Replace the Spec.describe function with empty function if false. */
    enabled: true,
    
    /** Indicates whether object 'a' is "equal to" 'b'. */
    equals: function(a, b) {
      var i;
      if (a instanceof Array && b instanceof Array) {
        if (a.length !== b.length) { return false; }
        for (i = 0; i < a.length; i++) { if (!Spec.equals(a[i], b[i])) { return false; } }
        return true;
      }
      if ((a !== null && b !== null) && (typeof a === "object" && typeof b === "object")) {
        for (i in a) { if(a.hasOwnProperty(i)) { if (!Spec.equals(a[i], b[i])) { return false; } } }
        return true;
      }
      return (a === b);
    },
    
    /** equivalent to xUint's assert */
    should: function(expection, message) {
      Spec.currentIndicator++;
      if (!expection) {
        var warning = [
          "[Spec failed",
          Spec.currentTitle ? " (" + Spec.currentTitle + ")] " : "] ",
          (message || (Spec.currentMessage + " " + Spec.currentIndicator) || "")
        ].join("");
        
        alert(warning);
        throw warning;
      }
      return !!expection;
    },
    
    /** Write your specification by using describe method. */
    describe: function(title, spec) {
      Spec.currentTitle = title;
      var name;
      for (name in spec) {
        if (spec.hasOwnProperty(name)) {
          Spec.currentMessage = name;
          Spec.currentIndicator = 0;
          spec[name]();
          Spec.currentIndicator = null;
        }
      }
      Spec.currentMessage = Spec.currentTitle = null;
    },
    Version: "0.1"
  };
  
  // Other BDD style stuffs.
  Spec.should.equal = function(a, b, message) { return Spec.should(Spec.equals(a, b), message); };
  Spec.should.not = function(a, message) { return Spec.should(!a, message); };
  Spec.should.not.equal = function(a, b, message) { return Spec.should(!Spec.equals(a, b), message); };
  if (!Spec.enabled) { Spec.describe = function(){}; }
  
  
  // self test
  Spec.describe("Spec object", {
    "should": function() {
      Spec.should(true);
      Spec.should(1);
    }, 
    "should.not": function() {
      Spec.should.not(false);
      Spec.should.not(0);
    },
    "should.equal": function() {
      Spec.should.equal(null, null);
      Spec.should.equal("", "");
      Spec.should.equal(12345, 12345);
      Spec.should.equal([0,1,2], [0,1,2]);
      Spec.should.equal([0,1,[0,1,2]], [0,1,[0,1,2]]);
      Spec.should.equal({}, {});
      Spec.should.equal({x:1}, {x:1});
      Spec.should.equal({x:[1]}, {x:[1]});
    },
    "should.not.equal": function() {
      Spec.should.not.equal([1,2,3], [1,2,3,4]);
      Spec.should.not.equal({x:1}, [1,2,3,4]);
    }
  });


  // -----------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------
  // int32 -> hexdigits string (e.g. 0x123 -> '00000123')
  function strfhex32(i32) {
    i32 &= 0xffffffff;
    if (i32 < 0) { i32 += 0x100000000; }
    var hex = Number(i32).toString(16);
    if (hex.length < 8) { hex = "00000000".substr(0, 8 - hex.length) + hex; }
    return hex;
  }
  Spec.describe("sha1", {
    "strfhex32": function() {
      Spec.should.equal(strfhex32(0x0),          "00000000");
      Spec.should.equal(strfhex32(0x123),        "00000123");
      Spec.should.equal(strfhex32(0xffffffff),   "ffffffff");
    }
  });
/*
  // int32 -> string (e.g. 123 -> '00000000 00000000 00000000 01111011')
  function strfbits(i32) {
    if (typeof arguments.callee.ZERO32 === 'undefined') {
      arguments.callee.ZERO32 = new Array(33).join("0");
    }
    
    var bits = Number(i32).toString(2);
    // '0' padding 
    if (bits.length < 32) bits = arguments.callee.ZERO32.substr(0, 32 - bits.length) + bits;
    // split by 8 bits
    return bits.replace(/(¥d{8})/g, '$1 ')
               .replace(/^¥s*(.*?)¥s*$/, '$1');
  }
  Spec.describe("sha1", {
    "strfbits": function() {
    Ti.API.info(strfbits(0));
    Ti.API.info(strfbits(1));
    Ti.API.info(strfbits(123));
      Spec.should.equal(strfbits(0),   "00000000 00000000 00000000 00000000");
      Spec.should.equal(strfbits(1),   "00000000 00000000 00000000 00000001");
      Spec.should.equal(strfbits(123), "00000000 00000000 00000000 01111011");
    }
  });
*/

  // -----------------------------------------------------------
  // SHA-1
  // -----------------------------------------------------------
  // Returns Number(32bit unsigned integer) array size to fit for blocks (512-bit strings)
  function padding_size(nbits) {
    var n = nbits + 1 + 64;
    return 512 * Math.ceil(n / 512) / 32;
  }
  Spec.describe("sha1", {
    "padding_size": function() {
      Spec.should.equal(padding_size(0),             16);
      Spec.should.equal(padding_size(1),             16);
      Spec.should.equal(padding_size(512 - 64 - 1),  16);
      Spec.should.equal(padding_size(512 - 64),      32);
    }
  });

  // 8bit string -> uint32[]
  function word_array(m) {
    var nchar = m.length;
    var size = padding_size(nchar * 8);
    var words = new Array(size);
    var i;
    for (i = 0, j = 0; i < nchar; ) {
      words[j++] = ((m.charCodeAt(i++) & 0xff) << 24) | 
                   ((m.charCodeAt(i++) & 0xff) << 16) | 
                   ((m.charCodeAt(i++) & 0xff) << 8)  | 
                   ((m.charCodeAt(i++) & 0xff));
    }
    while (j < size) { words[j++] = 0; }
    return words;
  }
  Spec.describe("sha1", {
    "word_array": function() {
      Spec.should.equal(word_array(""), [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
      Spec.should.equal(word_array("1234")[0], 0x31323334);
    }
  });

  function write_nbits(words, length, nbits) {
    if (nbits > 0xffffffff) {
      var lo = nbits & 0xffffffff;
      if (lo < 0) { lo += 0x100000000; }
      words[length - 1] = lo;
      words[length - 2] = (nbits - lo) / 0x100000000;
    } else {
      words[length - 1] = nbits;
      words[length - 2] = 0x0;
    }
    return words;
  }
  Spec.describe("sha1", {
    "write_nbits": function() {
      Spec.should.equal(write_nbits([0, 0], 2, 1),             [0, 1]);
      Spec.should.equal(write_nbits([0, 0], 2, 0xffffffff),    [0, 0xffffffff]);
      Spec.should.equal(write_nbits([0, 0], 2, 0x100000000),   [1, 0]);
      Spec.should.equal(write_nbits([0, 0], 2, 0x1ffffffff),   [1, 0xffffffff]);
      Spec.should.equal(write_nbits([0, 0], 2, 0x12300000000), [0x123, 0]);
      Spec.should.equal(write_nbits([0, 0], 2, 0x123abcdef12), [0x123, 0xabcdef12]);
    }
  });

  function padding(words, nbits) {
    var i = Math.floor(nbits / 32);
    
    words[i] |= (1 << (((i + 1) * 32) - nbits - 1));
    write_nbits(words, padding_size(nbits), nbits);
    return words;
  }

  function digest(words) {
    var i = 0, t = 0;
    var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    
    while (i < words.length) {
      var W = new Array(80);
      
      // (a)
      for (t = 0;  t < 16; t++) { W[t] = words[i++]; }
      
      // (b)
      for (t = 16; t < 80; t++) {
        var w = W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16];
        W[t] = (w << 1) | (w >>> 31);
      }
      
      // (c)
      var A = H[0], B = H[1], C = H[2], D = H[3], E = H[4];
      
      // (d) TEMP = S5(A) + ft(B,C,D) + E + Wt + Kt;
      //     E = D; D = C; C = S30(B); B = A; A = TEMP;
      for (t = 0; t < 80; t++) {
        var tmp = ((A << 5) | (A >>> 27)) + E + W[t];
        
        if      (t >=  0 && t <= 19) { tmp += ((B & C) | ((~B) & D))        + 0x5a827999; }
        else if (t >= 20 && t <= 39) { tmp += (B ^ C ^ D)                   + 0x6ed9eba1; }
        else if (t >= 40 && t <= 59) { tmp += ((B & C) | (B & D) | (C & D)) + 0x8f1bbcdc; }
        else if (t >= 60 && t <= 79) { tmp += (B ^ C ^ D)                   + 0xca62c1d6; }
        
        E = D; D = C; C = ((B << 30) | (B >>> 2)); B = A; A = tmp;
      }
      
      // (e) H0 = H0 + A, H1 = H1 + B, H2 = H2 + C, H3 = H3 + D, H4 = H4 + E.
      H[0] = (H[0] + A) & 0xffffffff;
      H[1] = (H[1] + B) & 0xffffffff;
      H[2] = (H[2] + C) & 0xffffffff;
      H[3] = (H[3] + D) & 0xffffffff;
      H[4] = (H[4] + E) & 0xffffffff;
      if (H[0] < 0) { H[0] += 0x100000000; }
      if (H[1] < 0) { H[1] += 0x100000000; }
      if (H[2] < 0) { H[2] += 0x100000000; }
      if (H[3] < 0) { H[3] += 0x100000000; }
      if (H[4] < 0) { H[4] += 0x100000000; }
    }
    
    return H;
  }

  // message: 8bit string
  var SHA1 = function(message) {
    this.message = message;
  };

  function strfhex8(i8) {
    i8 &= 0xff;
    if (i8 < 0) { i8 += 0x100; }
    var hex = Number(i8).toString(16);
    if (hex.length < 2) { hex = "00".substr(0, 2 - hex.length) + hex; }
    return hex;
  }


  _base64_keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  SHA1.prototype = {
    digest: function() {
      var nbits = this.message.length * 8;
      var words = padding(word_array(this.message), nbits);
      return digest(words);
    },

    base64digest: function() {
      var hex = this.hexdigest();
      var output = "";
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;
      while (i < hex.length) {
        chr1 = parseInt(hex.substring(i,   i+2), 16);
        chr2 = parseInt(hex.substring(i+2, i+4), 16);
        chr3 = parseInt(hex.substring(i+4, i+6), 16);
   
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
   
        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }
   
        output = output +
        _base64_keyStr.charAt(enc1) + _base64_keyStr.charAt(enc2) +
        _base64_keyStr.charAt(enc3) + _base64_keyStr.charAt(enc4);
        i += 6;
      }

      return output;
    },
    
    hexdigest: function() {
      var digest = this.digest();
      var i;
      for (i = 0; i < digest.length; i++) { digest[i] = strfhex32(digest[i]); }
      return digest.join("");
    }
  };
  
  Spec.describe("sha1", {
    "SHA1#hexdigest": function() {
      Spec.should.equal(new SHA1("").hexdigest(),       "da39a3ee5e6b4b0d3255bfef95601890afd80709");
      Spec.should.equal(new SHA1("1").hexdigest(),      "356a192b7913b04c54574d18c28d46e6395428ab");
      Spec.should.equal(new SHA1("Hello.").hexdigest(), "9b56d519ccd9e1e5b2a725e186184cdc68de0731");
      Spec.should.equal(new SHA1("9b56d519ccd9e1e5b2a725e186184cdc68de0731").hexdigest(), "f042dc98a62cbad68dbe21f11bbc1e9d416d2bf6");
      Spec.should.equal(new SHA1("MD5abZRVSXZVRcasdfasdddddddddddddddds+BNRJFSLKJFN+SEONBBJFJXLKCJFSE)RUNVXDLILKVJRN)#NVFJ)WVFWRW#)NVS$Q=$dddddddddddddWV;no9wurJFSE)RUNVXDLILKVJRN)#NVFJ)WVFWRW#)NVS$Q=$dddddddddddddWV;no9wurJFSE)RUNVXDLILKVJRN)#NVFJ)WVFWRW#)NVS$Q=$dddddddddddddWV;no9wurJFSE)RUNVXDLILKVJRN)#NVFJ)WVFWRW#)NVS$Q=$dddddddddddddWV;no9wuraddddddasdfasdfd").hexdigest(), "662dbf4ebc9cdb4224766e87634e5ba9e6de672b");
    }
  });
  
  return SHA1;
}());

exports.SHA1 = SHA1; // add for node.js
return exports;}()).SHA1;
var Utils = (function(){var exports={};
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
return exports;}());
var events = (function(){var exports={};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var isArray = Array.isArray;

function EventEmitter() { }
exports.EventEmitter = EventEmitter;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) { this._events = {}; }
  this._maxListeners = n;
};


EventEmitter.prototype.emit = function() {
  var type = arguments[0];

  if (!this._events) { return false; }
  var handler = this._events[type];
  if (!handler) { return false; }

  var args, l, i;
  if (typeof handler === 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        l = arguments.length;
        args = new Array(l - 1);
        for (i = 1; i < l; i++) { args[i - 1] = arguments[i]; }
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    l = arguments.length;
    args = new Array(l - 1);
    for (i = 1; i < l; i++) { args[i - 1] = arguments[i]; }

    var listeners = handler.slice();
    for (i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) { this._events = {}; }

  // To avoid recursion in the case that type === "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // If we've already got an array, just append.
    this._events[type].push(listener);

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._maxListeners !== undefined) {
        m = this._maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('.once only takes instances of Function');
  }

  var self = this;
  function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  self.on(type, g);

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) { return this; }

  var list = this._events[type];

  if (isArray(list)) {
    var i, position = -1;
    for (i = 0, length = list.length; i < length; i++) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener))
      {
        position = i;
        break;
      }
    }

    if (position < 0) { return this; }
    list.splice(position, 1);
    if (list.length === 0) {
      delete this._events[type];
    }
  } else if (list === listener ||
             (list.listener && list.listener === listener))
  {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) { this._events[type] = null; }
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) { this._events = {}; }
  if (!this._events[type]) { this._events[type] = []; }
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};
return exports;}());

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
        //
        // incoming data(wait:short)
        //
        return setTimeout(nextTick, 0);
      });
    }

    //
    // incoming data(wait:long)
    //
    return setTimeout(nextTick, 100);
  };
  var nextTick = function(){
    if(0 < self.bufferSize){
      return self._read_buffer(function (readSuccess){
        if(readSuccess){
          return setTimeout(nextTick, 0);
        }

        //
        // unknown read packet(success: false)
        // then clear read buffer
        //

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
