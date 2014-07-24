// =========================== SOCKET CONNECTIOM =========================== //

var behavior = require("./behavior");
var io = require('socket.io')(behavior.http);
var serverjs = require("./server");
var server = new serverjs.Server();

// ================================ ACTION ================================ //

// when the user clicks the start/stop button.. 
io.on('connection', function(socket){
  // log when the connection is made
  console.log('initialization...');
  behavior.stream.write('initialization...' + "\r\n");
  // on start button press
  socket.on('start', function(){
    behavior.action();
    behavior.statPrintWrapper();
  });
  // on stop button press
  socket.on('stop', function(){
    behavior.stopAction();
  });
  // on reset button press
  socket.on('reset', function(){
    behavior.resetAction();
  });
    // on reset button press
  socket.on('DHT', function(){
    behavior.applyDHT = true;
  });
  // on browser exit
  socket.on('disconnect', function(){
    console.log('Disconnected');
    behavior.stream.write('Disconnected' + "\r\n");
  });
});

// when the server receives a request..
behavior.http.on('request', function(req, res) {
  // print out the type of the request to the console
  console.log("request made! " + req.method);
  // increment the request count
  behavior.count += 1;
  behavior.currCount += 1;
});
