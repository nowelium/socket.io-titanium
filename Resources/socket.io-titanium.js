var global = this.window = {};

require('socket.io/lib/io');

var io = this.io = global.io;

require('socket.io/lib/util');
require('socket.io/lib/json');
require('socket.io/lib/parser');
require('socket.io/lib/events');
require('socket.io/lib/namespace');
require('socket.io/lib/transport');

// T.B.D: websocket
io.transports = ['xhr-polling'];
require('socket.io/lib/transports/xhr');
io.transports.forEach(function(t){
  require('socket.io/lib/transports/' + t);
});

require('socket.io/lib/socket');

io.Socket.prototype.isXDomain = function (){
  return false;
};
io.util.request = function (){
  return Titanium.Network.createHTTPClient();
};

exports = {
  io: io,
  connect: function (){
    return io.connect.apply(io, arguments);
  }
};
