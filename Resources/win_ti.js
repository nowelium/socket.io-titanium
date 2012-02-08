var win = Titanium.UI.currentWindow;

var io = require('socket.io-titanium');
var socket = io.connect('169.254.10.100:8080');

var channelTable = Titanium.UI.createTableView();

var chat = socket.of('/chat');
chat.on('available_channel', function(channels){
  //
  // channel view
  //
  var rows = channels.map(function(channel){
    var row = Titanium.UI.createTableViewRow({
      title: channel
    });
    row.addEventListener('click', function (){
      channelTable.fireEvent('click:channel', {
        channelId: channel
      });
    });
    return row;
  });
  channelTable.setData(rows);
});
channelTable.addEventListener('click:channel', function(evt){
  //
  // chat view
  //
  var chatWindow = Titanium.UI.createWindow({
    title: 'room: ' + evt.channelId + ' chat'
  });

  var lastRowIndex = 0;
  var chatTable;
  if(/android/i.test(Titanium.Platform.osname)){
    var input = Titanium.UI.createSearchBar({
      showCancel: false
    });
    chatTable = Titanium.UI.createTableView({
      search: input
    });
    chatWindow.add(chatTable);
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
    chatTable = Titanium.UI.createTableView({
      top: 60,
      height: win.height - 60,
      width: win.width
    });

    chatWindow.add(header);
    chatWindow.add(input);
    chatWindow.add(chatTable);
  }

  chat.on('joined', function (messages){
    var rows = messages.map(function(message){
      return Titanium.UI.createTableViewRow({
        title: message,
        color: '#999'
      });
    });
    var section = Titanium.UI.createTableViewSection({
      headerTitle: 'archived message(s)'
    });
    rows.forEach(function(row){
      section.add(row);
    });
    chatTable.setData([section]);
    // delay
    setTimeout(function (){
      chatTable.scrollToIndex(rows.length - 1, { animated: false });
      lastRowIndex = rows.length;
    }, 100);
  });
  var addMessage = function(message){
    var row = Titanium.UI.createTableViewRow({
      title: message
    });
    chatTable.appendRow(row, { animated: true });
    // delay
    setTimeout(function (){
      chatTable.scrollToIndex(lastRowIndex, { animated: true });
      lastRowIndex = lastRowIndex + 1;
    }, 100);
  };
  chat.on('posted', function(value){
    return addMessage('you posted: ' + value.message);
  });
  chat.on('user:join', function(value){
    return addMessage(value.id + ' joined this channel');
  });
  chat.on('user:leave', function(value){
    return addMessage(value.id + ' leaved this channel');
  });
  chat.on('user:message', function(value){
    return addMessage(value.id + ' says ' + value.message);
  });
  input.addEventListener('return', function (){
    var messageValue = input.value;
    if(/^\s+$/.test(messageValue)){
      return;
    }

    chat.emit('post', messageValue);
    input.value = '';
  });
  chatWindow.addEventListener('open', function (){
    chat.emit('join', {
      channelId: evt.channelId
    });
  });
  chatWindow.addEventListener('close', function (){
    chat.disconnect();
  });

  chatWindow.add(chatTable);
  return Titanium.UI.currentTab.open(chatWindow);
});

win.add(channelTable);
