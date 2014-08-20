// =========================== SOCKET CONNECTIOM =========================== //

var behavior = require("./behavior");
var serverjs = require("./server");
var server = new serverjs.Server();
var io = require('socket.io')(serverjs.http);
var PageConfiguration = require("./PageConfiguration");
//var Trial = require("./ChordWithSmallGroup");
var requirejs = require('requirejs');

requirejs.config({
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require
});

// ================================ ACTION ================================ //

var applyTrial = false;

// when the user does something..
io.on('connection', function(socket){
  // log when the connection is made
  console.log('initialization...');
  behavior.stream.write('initialization...' + "\r\n");
  
//on start button press
  socket.on('start', function(){

    setInterval( function() {
        socket.emit('hop');
        }, 10);

    //same requests are gatherd to a representative  
    if( !applyTrial )           
    { 
        behavior.action();
        behavior.statPrintWrapper();
    }
    //participants of chord ring are small
    else                        
    {
        Trial.action();
    }
  });
    
  // on stop button press
  socket.on('stop', function(){
    if( !applyTrial )
    {
        behavior.stopAction();
    }
    else
    {
        Trial.StopAction();
    }
  });
  // on reset button press
  socket.on('reset', function(){
    behavior.resetAction();
  });
  // on DHT button press
  socket.on('DHT', function(){
    behavior.applyDHT = !behavior.applyDHT;
    if (behavior.applyDHT) {
      socket.emit('applyDHT');
    }
    else {
      socket.emit('noDHT')
    }
  });
    // on Trial button press
    socket.on('trial', function(){
        applyTrial = !applyTrial;
        if( applyTrial )
        {
            socket.emit('apply Trial');
        }
        else{
            socket.emit('no Trial');
        }
    });

  
  socket.on('newNode', function() {
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    console.log('adding a new node! here it comes');
    socket.emit('join');
    behavior.joinRand();
  })

  socket.on('leaveNode', function() {
    console.log('taking out a node now');
    socket.emit('leave');
    behavior.leaveRand();
  })

  socket.on('refresh', function() {
    console.log('rereshing the ring');
    behavior.refreshRing();
  })
  
  // on browser exit
  socket.on('disconnect', function(){
    console.log('Disconnected');
    behavior.stream.write('Disconnected' + "\r\n");
  });
});

// when the server receives a request..
serverjs.http.on('request', function(req, res) {
  // print out the type of the request to the console
  // console.log("request made! " + req.method);
  // increment the request count
  behavior.count += 1;
  behavior.currCount += 1;
});
