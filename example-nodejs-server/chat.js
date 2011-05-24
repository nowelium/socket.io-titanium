var http = require('http');

var server = http.createServer(function(req, res){
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('hello world');
});
server.listen(8080);

var io = require('socket.io');
var socket = io.listen(server);
socket.on('connection', function(client){
  console.log('connect: ' + client.sessionId);
  client.on('message', function (message){
    console.log('client message: ' + message);
    client.send('rely: ' + message);
    client.broadcast(client.sessionId + ' says: ' + message);
  });
  client.on('disconnect', function(){
    console.log('disconnect: ' + client.sessionId);
  });
});
