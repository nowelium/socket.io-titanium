var global = this;
var io = this.io = global.io = {};
io.version = '0.8.7';
io.protocol = 1;
io.transports = [];
io.j = [];
io.sockets = {};

require('socket.io/lib/util');
require('socket.io/lib/json');
require('socket.io/lib/parser');
require('socket.io/lib/events');
require('socket.io/lib/namespace');
require('socket.io/lib/transport');

require('socket.io/lib/transports/xhr');
require('socket.io/lib/transports/xhr-polling');
require('socket.io/lib/transports/websocket');

require('socket.io/lib/socket');

// {{{ @lib/transports/ws
// titanium-websocket-client :: https://github.com/masuidrive/ti-websocket-client
var WebSocket = require('ti-websocket-client/ti-websocket-client').WebSocket;
io.Transport.websocket.prototype.open = function (){
  var query = io.util.query(this.socket.options.query)
    , self = this
    , Socket

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

exports = {
  io: io,
  connect: function (){
    return io.connect.apply(io, arguments);
  }
};
