# WebSocket client for Titanium Mobile

It's implementation of WebSocket client for Titanium Mobile.


## Supported protocols

* [hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07)


## How to use it

copy "ti-websocket-client.js" to your app Resources directory.

```javascript
var WebSocket = require('ti-websocket-client').WebSocket;

ws = new WebSocket("ws://localhost:3000/");

ws.onopen = function () {
	alert("Connected");
	ws.send("Hello");
};

ws.onclose = function () {
	alert("Disconnected");
};

ws.onmessage = function (message) {
	alert("> "+message.data);
};

ws.onerror = function (e) {
	alert('Error: ' + (e ? JSON.stringify(e) : 'A unknown error occurred'));
};
```

## Progress

* Working good with node and ruby's websocket servers
* You can run on Android and iPhone.


## License

MIT License.
Copyright 2011 Yuichiro MASUI <masui@masuidrive.jp>
