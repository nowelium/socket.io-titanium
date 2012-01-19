var io = require('socket.io').listen(8080);

var c = [];
io.sockets.on('connection', function(client){
  console.log('connect: ' + client.id);
  client.broadcast.emit('user connected');
  c.push(client);

  client.on('message', function (message){
    console.log('client message: ' + message);
    client.send('rely:' + message);
    client.broadcast.emit(client.id + ' says: ' + message);
    // emulate broadcast
    c.forEach(function(e){
      e.send(' says: ' + message);
    });
  });

  client.on('disconnect', function(){
    console.log('disconnect: ' + client.id);
  });
});
