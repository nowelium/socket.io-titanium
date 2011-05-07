Titanium.UI.setBackgroundColor('#FFF');

require('socket.io-titanium');

var socket = new io.Socket('169.254.10.100', { port: 8080 });
socket.connect();
socket.send('hello world!!');
socket.on('message', function (message){
  Titanium.API.debug('got message: ' + message);
});

var win = Titanium.UI.createWindow({
  barColor: '#369',
  tabBarHidden: true,
  title: 'demo'
});
win.add(Titanium.UI.createLabel({
  text: 'check console output'
}));

var tabGroup = Titanium.UI.createTabGroup();
tabGroup.addTab(Titanium.UI.createTab({
  window: win
}));  
tabGroup.open();
