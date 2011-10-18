// socket.io@0.8.5
var io = require('socket.io').listen(8080);
io.sockets.on('connection', function(client){
  console.log('connect : ' + client.sessionId);
  client.on('message', function (message){
    console.log('client message: ' + message);
    client.emit('reply', {msg: message});
  });
  client.on('disconnect', function(){
    console.log('disconnect : ' + client.sessionId);
  });
});
