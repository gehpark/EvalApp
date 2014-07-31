// =========================== SERVER PROTOTYPE =========================== //

// initialize app to be a function handler
var express = require('express');
exports.app = express();
var httpo = require('http');
// start a collection to measure server load
var stats = require('measured').createCollection();
// supply the function handler to an HTTP server
exports.http = httpo.Server(exports.app);

//create a client prototype
exports.Server = function () {
  // create an array to hold all its received requests
  this.reqs = [];
  // create a peer element to represent the client for WebRTC
  // this.peer = new Peer(id, {key: 'myapikey'}); 
}
// make the HTTP server listen on our port
exports.http.listen(8111, function(){
  console.log('Listening on *:' + 8111);
});

exports.app.get('/', function(req, res){
  res.sendfile('index.html');
  stats.meter('requestsPerSecond').mark();
  // //uncomment below to see server headers
  // console.log("headers server");
  // console.log(req.headers);
});
exports.app.use(express.static(__dirname, '/public'));
