var io = require('socket.io-titanium');

var win = Titanium.UI.currentWindow;

if(/android/i.test(Titanium.Platform.osname)){
  var input = Titanium.UI.createSearchBar({
    showCancel: false
  });
  var table = Titanium.UI.createTableView({
    search: input
  });
  win.add(table);
} else {
  var header = Titanium.UI.createView({
    top: 0,
    height: 60,
    width: win.width,
    borderWidth: 2,
    borderColor: '#333'
  });
  var input = Titanium.UI.createTextField({
    top: 10,
    height: 40,
    width: 200,
    color: '#333',
    hintText: 'message here'
  });
  var table = Titanium.UI.createTableView({
    top: 60,
    height: win.height - 60,
    width: win.width
  });

  win.add(header);
  win.add(input);
  win.add(table);
}


//var socket = new io.Socket('169.254.10.100', { port: 8080 });
// or
//var socket = io.createSocket('169.254.10.100', { port: 8080 });
var socket = new io.Socket('169.254.10.100', { port: 8080 });
socket.connect();
socket.on('message', function (message){
  table.appendRow({title: message}, {animationStyle: Titanium.UI.iPhone.RowAnimationStyle.LEFT});
});

input.addEventListener('return', function (){
  var messageValue = input.value;
  if(/^\s+$/.test(messageValue)){
    return;
  }

  socket.send(messageValue);
  input.value = '';
});
