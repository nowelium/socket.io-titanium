var io = require('socket.io').listen(8080);
io.sockets.on('connection', function(client){
  console.log('connect: ' + client.id);

  client.on('message', function (message){
    console.log('client message: ' + message);
    client.send('rely:' + message);
    client.broadcast.emit(client.id + ' says: ' + message);
  });

  client.on('disconnect', function(){
    console.log('disconnect: ' + client.id);
  });
});
