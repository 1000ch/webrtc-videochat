var ws = require('websocket.io');
var server = ws.listen(8124);

var clients = {};

server.on('connection', function (socket) {
  socket.on('message', function (data) {
    
    // guidとusernameを常に同期する
    var json = JSON.parse(data);
    clients[json.guid] = json.username;
    
    // 送信データに付与する
    json.clients = clients;
    data = JSON.stringify(json);
    
    server.clients.forEach(function (client) {
      client.send(data);
    });
  });
});