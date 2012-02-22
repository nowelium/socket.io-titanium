var win = Titanium.UI.currentWindow;

var io = require('socket.io-titanium');
var socket = io.connect('169.254.10.100:8080');
var image = socket.of('/image');

image.on('download', function(param){
  Titanium.API.debug('download base64 size: ' + param.base64.length);
});

win.addEventListener('focus', function(){
  Titanium.API.debug('upload start w/ download:false');
  image.emit('upload', {
    base64: 's' + new Array(65534 * 10).join('1') + 'e',
    download: false
  });
});

win.add(Titanium.UI.createLabel({
  text: 'see console log'
}));
