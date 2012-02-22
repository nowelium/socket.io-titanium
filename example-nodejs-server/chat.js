var io = require('socket.io').listen(8080);

var archiveMessages = {};
var channels = ['foo channel', 'bar channel'];

var chat = io.of('/chat');
chat.on('connection', function(socket){
  console.log('connected: %s', socket.id);

  // push available channel list
  socket.emit('available_channel', channels);

  socket.on('join', function(value){
    console.log('%s joined channel: %s', socket.id, value.channelId);

    socket.join(value.channelId);
    socket.set('channel_id', value.channelId, function(){
      var messages = archiveMessages[value.channelId] || [];
      socket.emit('joined', messages);
      socket.broadcast.to(value.channelId).emit('user:join', {
        id: socket.id
      });
    });
  });

  socket.on('post', function(message){
    socket.get('channel_id', function(err, channelId){
      console.log('%s says<%s channel>: %s', socket.id, channelId, message);

      if(!(channelId in archiveMessages)){
        archiveMessages[channelId] = [];
      }
      archiveMessages[channelId].push(message);

      socket.emit('posted', {
        message: message
      });
      socket.broadcast.to(channelId).emit('user:message', {
        id: socket.id,
        message: message
      });
    });
  });

  socket.on('disconnect', function(){
    console.log('%s disconnected', socket.id);
    socket.get('channel_id', function(channelId){
      socket.leave(channelId);
      socket.broadcast.to(channelId).emit('user:leave', {
        id: socket.id
      });
    });
  });
});

var image = io.of('/image');
image.on('connection', function(socket){

  socket.on('upload', function(param){
    console.log('upload base64 size: %d', param.base64.length);
  
    if(param.download){
      socket.emit('download', {
        base64: 's' + new Array(65534).join('0') + 'e'
      });
    }
  });
});
