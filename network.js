
// ========== SOCKET CONNECTION ========== //
var behavior = require("./behavior");
var io = require('socket.io')(behavior.http);
//var pr = require('Peer');
//var holla = require('holla');

// ========== ACTION =========== //

// log when the connection is made
io.on('connection', function(socket){
  console.log('initialization...');
  behavior.stream.write('initialization...' + "\r\n");
});

// when the user clicks the start button.. 
io.on('connection', function(socket){
  socket.on('start', function(){
    behavior.action();
  });
});

// when the user clicks the start button.. 
io.on('connection', function(socket){
  socket.on('stop', function(){
    behavior.stopAction();
  });
});

// the browser is turned off
io.on('connection', function(socket){
  socket.on('disconnect', function(){
    console.log('Disconnected');
    behavior.stream.write('Disconnected' + "\r\n");
  });
});

  // create a peer element to represent the client for WebRTC
//var peer = new pr.Peer(5, {key: 'myapikey'}); 
// connect all to each other? 
//var conn = (clients[0].peer).connect(clients[(0+1)%(clients.length)]);


// when a request is made
io.on('request', function() {});

// when a client leaves
io.on('leave', function() {});

// when a client leaves
io.on('leave', function() {});

// when a client leaves
io.on('leave', function() {});

// ====== WEBRTC ====== //

// conn.on('open', function() {
//   // do something;
// });

// peer.on('incoming', function() {
//   conn.on('data', function(data) {
//     // do something
//   });
// });
