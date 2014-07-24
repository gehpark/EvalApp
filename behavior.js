// ================================ MODULES ================================ //

// initialize app to be a function handler
var express = require('express');
exports.app = express();
var httpo = require('http');
// supply the function handler to an HTTP server
exports.http = httpo.Server(exports.app);

// require for exports.stream
var fs = require('fs');
// start a collection to measure server load
var stats = require('measured').createCollection();

// to set paths for the html and css files
//var path = require('path')
// import local files
var clientjs = require("./client");
var ringjs = require("./ring");


// this is the variable that will be set to true if we want to
// apply the DHT algorithm to compare how effective the algorithm
// is in decreasing server load
exports.applyDHT = false;

// ============================= CLIENT SET UP ============================= //

// the .port that we want to use
exports.port = 8111;

// this is the total number of clients
// ++ possible additions add and taking out clients during simulation
var numClients = 10;

// create an array of all the clients that we have
// this array will also work as a doubly linked list to represent
// the strcutre of the ring that we will use for the DHT chord algorithm
var clients = [];

// keep a list of the keys that we have
var keys = [];

// keep track of the new nodes. only used for set up purposes
var newNodes = [];


// create instances of Client for each client
for (var i = 0; i < numClients; i++) {
  // and add to the array
  clients.push(new clientjs.Client(i));
}

// // link the initial links of the ring structure together
// for (var c in clients) {
//   // set the succeeding element in the ring to be the
//   // following one in the clients list
//   clients[c].cw = clients[(c + 1) % clients.length];  
//   // set the preceding element in the ring to be the
//   // leading one in the clients list
//   clients[c].ccw = clients[(c - 1) % clients.length]; 
// }

// ========================== CLIENT SIDE SET UP ========================== //

// make the HTTP server listen on our port
exports.http.listen(exports.port, function(){
  console.log('Listening on *:' + exports.port);
});

exports.app.get('/', function(req, res){
  res.sendfile('index.html');
  stats.meter('requestsPerSecond').mark();
});
exports.app.use(express.static(__dirname, '/public'));


// ========================= NETWORK WEBRTC SET UP ========================= //

// create a new key for each data object
// and add it to the array of keys
for (var i in clientjs.requests) {
  keys.push(new ringjs.key(clientjs.requests[i]));
}
// create and set up the ring
var cRing = new ringjs.ring(4, clients);
cRing.setUp(keys, newNodes);
cRing.buildSuccessorsPredecessorsListAll();
cRing.buildFingerTableAll();

//debugging purposes
// var v = cRing.head;
// do {
  // for (var n = 0; n < v.fingerTable.length; n++) {
  //   console.log(v.nodeID + " : " + v.fingerTable[n][1].nodeID);
  // }
  // console.log("does it connect? " + v.nodeID + "." + v.cw.nodeID);
  // v = v.cw;
// } while(v != cRing.head)

// console.log("finger table:");
// console.log(isBetween(1,5,10,15));
// stabilize the ring every x seconds?
// var function = setInterval(cRing.stabilize(), 10000); 


// ============================= TIMER SET UP ============================= //

// set the duration for which we want the simulation to run
var maxTime = 5000;

// save the start time
var start = new Date();
var startmil = start.getTime();

// set the timer interval
var timerInterval = 1000;

// default this variable to false
var isTimerDone = false;

// these variables are for statPrint; an alternative to statFunc
// issues with reporting the request count with using the 'measured' module
// set count to start at -3 due to initialization requests that are made
exports.count = -3;
exports.currCount = 0;
var mean = 0;
var current = 0;
var oneMin = 0;

// ============================= OUTPUT SET UP ============================= //

// create a file in which we can save our data
exports.stream = fs.createWriteStream("output/" + startmil + ".txt");

// write a little intro for the file
exports.stream.write("Running Simulation for..." + "\r\n");
exports.stream.write("exports.port:" + exports.port + "\r\n");
exports.stream.write("Number of Clients: " + numClients + "\r\n");
exports.stream.write("Length of Duration: " + maxTime + "\r\n");

// probably the most inefficient way to get the data but
// cant figure out what this collection thing is
// for graphing purposes
function dataEntry (splitData) {
  if(splitData.length > 1) {
    this.mean = splitData[0].substr(29);
    this.count = splitData[1].substr(8);
    this.curr = splitData[2].substr(14);
    this.oneMin = splitData[3].substr(14);
    this.fiveMin = splitData[4].substr(14);
    this.fifteenMin = splitData[5].substr(15);
  }
}

// xy pair. also for graphing purposes.
function timeDataPair (time, dataEntry) {
  this.t = time;
  this.dataPoint = dataEntry;
}

// an array that tracks the data of each type of request count
// for graphing purposes
var timeData = [];


// ================================= GRAPH ================================= //

//var vis = d3.select("#graph").append("svg");


// ============================ REQUEST ACTION ============================ //

// this is for the gather and send method without webRTC
// assign a key to some client
var setGatherKey = function() {
  // we want to make sure each request type is assigned to a client
  for (var i in clientjs.requests) {
    // choose a random client
    // use math.random for now -> replace with SHA-1
    var randClient = clients[Math.floor(Math.random() * clients.length)];
    // add the request to the array of keys that this client is responsible for
    randClient.gatherKey.push(clientjs.requests[i]);
    // now connect the request to client from its side, too
    clientjs.requests[i].representative = randClient;
  }
}

// we want to gather elements together
var gather = function(c, randRequest, timeElapsed) {
  // log that the request was forwarded to another client
  console.log(clients[c].id + "'s request sent to: " + randRequest.representative.id);
  // add it to the list of requests that the client just received
  randRequest.representative.reqs.push(new clientjs.logInfo(clients[c].id, timeElapsed, randRequest.reqType));
  // increment the request counter
  randRequest.representative.reqCounter++;
}

exports.action = function () {
  if (exports.applyDHT) {
    exports.actionChord();
  }
  else {
    exports.actionGather();
  }
}
// this function starts the sending of the requests from the clients
exports.actionGather = function() {
  // since it is an exported function, we want to include request here.. 
  var request = require("request");
  //// use below for GUI stuff to display console
  // var doc = document.open()
  // set up which clients should be responsible for which types of requests
  setGatherKey();
  // set the start time here again to mark when the button is actually pressed
  start = new Date()

  // at each timer interval make requests to the server
  exports.reqFunc = setInterval(function () {
    // log the current time
    var timeElapsed = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed: " + timeElapsed + "\r\n");

    // each client will make a request
    for (var c in clients) {
      // choose what type of request to (randomly) "make"
      var randRequest = clientjs.randReq();
      // print to the console
      console.log(randRequest.reqType + " requested by: " + clients[c].id + ", TIME: " + timeElapsed);

      gather(c, randRequest, timeElapsed);
      // save to each client's personal request log
      clients[c].reqs.push(randRequest.reqType);
    };
  }, timerInterval);

  // at each timer interval, send requests to the server
  exports.sendReqFunc = setInterval(function () {
    for (var i in clientjs.requests) {
      if (clientjs.requests[i].representative.reqCounter != 0) {
        // create a variable to hold the options for this request
        var options = {
          uri: "http://localhost:" + exports.port + "/",
          // default to GET
          method: clientjs.requests[i].reqType,
          body: ""
        }
        clientjs.makeReq(options);
      }
    }
  }, timerInterval);

  // // at each timer interval print out server stats
  // exports.statFunc = setInterval(function() {
  //   // log the current time
  //   var timeElapsedStat = (new Date().getTime() - start).toString();
  //   exports.stream.write("Time Elapsed at stat check: " + timeElapsedStat + "\r\n");
    
  //   var dataJSON = stats.toJSON();
  //   var test = dataJSON.mean;
  //   // get the server data & log
  //   console.log(dataJSON);
  //   var splitdata = JSON.stringify(dataJSON).split(',');
  //   var entry = new dataEntry(splitdata);
  //   // add on the type of count that we want to our data array
  //   // right now we are keeping track of the mean # of requests
  //   timeData.push(new timeDataPair(timeElapsedStat, entry.mean));
  //   // save the data onto the output file
  //   for (var i = 0; i < splitdata.length; i++) {
  //       exports.stream.write(splitdata[i] + "\r\n");
  //     }
  // }, timerInterval);
}

// wrapper for the function that prints out statistics for the server
// load measuring tool (alternate version)
exports.statPrintWrapper = function() {
  // this function is an alternative to statfunc
  exports.statPrint = setInterval(function() {
    // get the current time for the record
    var timeElapsedStat = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed at stat check: " + timeElapsedStat + "\r\n");
    
    // calculate all the statistics
    mean = exports.count / timeElapsedStat;
    current = exports.currCount / timerInterval;
    oneMin = exports.count / 60000;

    // print to both the console and the output file
    console.log("Server Statistics: time : " + timeElapsedStat);
    exports.stream.write("Server Statistics: time : " + timeElapsedStat + "\n");
    console.log("   Total count: " + exports.count);
    exports.stream.write("    Total count: " + exports.count + "\n");
    console.log("   Mean: " + mean);
    exports.stream.write("    Mean: " + mean + "\n");
    console.log("   Current Rate: " + current);
    exports.stream.write("    Current Rate: " + current + "\n");
    console.log("   1 Minute Rate: " + oneMin);
    exports.stream.write("    1 Minute Rate: " + oneMin + "\n");

    // reset the current count
    exports.currCount = 0;
  }, timerInterval);
}

// claim: dont really need to emulate the response from representative to requesters
// since we want to measure server load

// this function starts the sending of the requests from the clients
exports.actionChord = function() {
  // since it is an exported function, we want to include request here.. 
  var request = require("request");
  //// use below for GUI stuff to display console
  // var doc = document.open()
  // set the start time here again to mark when the button is actually pressed
  start = new Date();

  // at each timer interval make requests to the server
  exports.reqFuncChord = setInterval(function () {
    // log the current time
    var timeElapsed = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed: " + timeElapsed + "\r\n");

    var currNode = cRing.head;
    // each client will make a request
    do {
      timeElapsed = (new Date().getTime() - start).toString();
      // choose what type of request to (randomly) "make". we pick a random key
      var randRequest = keys[Math.floor(Math.random() * keys.length)];
      // print to the console
      console.log(randRequest.dat.reqType + " requested by: " + currNode.client.id + ", TIME: " + timeElapsed);
      // find the responsible node and using the requesting node itself and its finger table, 
      var respNode = cRing.findFingerTable(randRequest.ID, currNode, Math.pow(2,cRing.m));
      // add the current node's id to the list of requests that the responsible node received
      respNode.recipients.push(clientjs.logInfo(currNode.nodeID, timeElapsed, randRequest.id));
      // save to each client's personal request log
      currNode.client.reqs.push(randRequest.reqType);
      currNode = currNode.cw;
    } while (currNode != cRing.head);
  }, timerInterval);

  // at each timer interval, send requests to the server
  exports.sendReqFuncChord = setInterval(function () {
    var currNode = cRing.head;
    do {
      for(var i = 0; i < currNode.recipients.length; i++) {
        console.log("THIS MAKES SENSE TO BE 1 " + currNode.recipients.length);
        console.log("THIS MAKES SENSE TO BE 1 " + currNode.recipients.length);
        var options = {
          uri: "http://localhost:" + exports.port + "/",
          // default to GET
          method: currNode.key[i],
          body: ""
        }
        clientjs.makeReq(options);
      }
      // reset the recipients array for the next round
      currNode.recipients = [];
      currNode = currNode.cw;
    } while (currNode != cRing.tail);
  }, timerInterval * 3);
}

// stop the communication
exports.stopAction = function() {
  if (exports.applyDHT) {
    clearInterval(exports.reqFuncChord);
    clearInterval(exports.sendReqFuncChord);
  }
  else {
    clearInterval(exports.reqFunc);
    clearInterval(exports.sendReqFunc);
  }
  clearInterval(exports.statFunc);
  clearInterval(exports.statPrint);
}

// reset the statistics for a rerun
exports.resetAction = function() {
  // reset the clients' fields
  exports.stream.close();
  for (var c in clients) {
    clientjs.resetClients();
  }
  // reset counters and times
  exports.count = 0;
  exports.currCount = 0;
  start = new Date();
}






