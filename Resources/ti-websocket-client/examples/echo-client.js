//
// WebSocket client sample app for Titanium Mobile
//
// Yuichiro MASUI <masui@masuidrive.jp>
// MIT License
var WebSocket = require('ti-websocket-client').WebSocket;

var win = Titanium.UI.createWindow({  
    title:'WebSocket',
    backgroundColor:'#fff'
});

var textarea = Titanium.UI.createTextArea({
	backgroundColor: "#eee",
	value: '',
	editable: false,
	top: 70,
	left: 0,
	right: 0,
	bottom: 0
});
win.add(textarea);

var connectBtn = Titanium.UI.createButton({
	title:'Connect',
	font:{fontSize:16,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width: 100,
	height: 20,
	top: 5,
	left: 5
});
win.add(connectBtn);

var ws;
connectBtn.addEventListener('click', function() {
	ws = new WebSocket("ws://localhost:3000/");
	
	ws.onopen = function () {
		Ti.API.info("message Connected");
		log("Connected");
	};

	ws.onclose = function () {
		log("Disconnected");
	};

	ws.onmessage = function (message) {
		log("> "+message.data);
	};

	ws.onerror = function (e) {
		log('Error: ' + (e ? JSON.stringify(e) : 'A unknown error occurred'));
	};
	
	log("Connecting...");
});

var closeBtn = Titanium.UI.createButton({
	title:'Close',
	font:{fontSize:16,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:100,
	height: 20,
	top: 5,
	right: 5
});

win.add(closeBtn);
closeBtn.addEventListener('click', function() {
	ws.close();
});

var log = function(str) {
	textarea.value += str + "\n";
};

var messageField = Ti.UI.createTextField({
    borderStyle:Titanium.UI.INPUT_BORDERSTYLE_ROUNDED,
	width:230,
	height: 30,
	top: 35,
	left: 5
});
win.add(messageField);

var sendBtn = Titanium.UI.createButton({
	title:'Send',
	font:{fontSize:16,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:70,
	height: 30,
	top: 35,
	right: 5
});
win.add(sendBtn);
sendBtn.addEventListener('click', function() {
	var v = messageField.value;
	log('< ' + v);
	ws.send(v);
	messageField.value = "";
	messageField.blur();
});



win.open();

