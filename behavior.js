
exports.totalHop = 0;
exports.joinCount = 0;
exports.leaveCount = 0;

// ================================ MODULES ================================ //
// require for exports.stream
var fs = require('fs');
var Configuration = require("./configuration");

// to set paths for the html and css files
//var path = require('path')
// import local files
var clientjs = require("./client");
var ringjs = require("./ring");

// =========================== CLIENT VARIABLES =========================== //

// this is the variable that will be set to true if we want to
// apply the DHT algorithm to compare how effective the algorithm
// is in decreasing server load
exports.applyDHT = false;

// create an array of all the clients that we have
// this array will also work as a doubly linked list to represent
// the strcutre of the ring that we will use for the DHT chord algorithm
var clients = [];

// keep track of the new nodes. only used for set up purposes
var newNodes = [];

// create instances of Client for each client
for (var i = 0; i < Configuration.ClientNum; i++) {
  // and add to the array
  clients.push(new clientjs.Client(i));
}

// ========================= NETWORK WEBRTC SET UP ========================= //
// create and set up the ring
var cRing = new ringjs.ring(Configuration.ChordRingSize, clients);
// create a new key for each data object
// and add it to the array of keys
for (var i in clientjs.requests) {
  cRing.keys.push(new ringjs.key(clientjs.requests[i]));
}
cRing.setUp(newNodes);
cRing.buildFingerTableAll();
cRing.buildSuccessorsPredecessorsListAll();


// ============================= TIMER SET UP ============================= //
// save the start time
var start = new Date();
var startmil = start.getTime();

// default this variable to false
var isTimerDone = false;

// these variables are for statPrint; an alternative to statFunc
// issues with reporting the request count with using the 'measured' module
exports.count = 0;
exports.currCount = 0;
var mean = 0;
var current = 0;
var oneMin = 0;



var relation = function(from, key, rep) {
  this.sender = from;
  this.key = key;
  this.rep = rep;
}
// ============================= OUTPUT SET UP ============================= //

// create a file in which we can save our data
exports.stream = fs.createWriteStream("output/" + startmil + ".txt");

// write a little intro for the file
exports.stream.write("Running Simulation for..." + "\r\n");
exports.stream.write("exports.port:" + exports.port + "\r\n");
exports.stream.write("Number of Clients: " + Configuration.ClientNum + "\r\n");

// probably the most inefficient way to get the data but
// cant figure out what this collection thing is
// for graphing purposes
// (to be used with the measure module)
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

// wrapper funtion to start generating and sending requests depending on
// whether we want to use the DHT or not
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
  }, exports.timeIntervalC2R );

  // at each timer interval, send requests to the server
  exports.sendReqFunc = setInterval(function () {
    for (var i in clientjs.requests) {
      if (clientjs.requests[i].representative.reqCounter != 0) {
        // create a variable to hold the options for this request
        var options = {
          uri: "http://localhost:" + Configuration.port + "/",
          // default to GET
          method: clientjs.requests[i].reqType,
          body: ""
        }
        clientjs.makeReq(options); //, clientjs.requests[i], timeElapsed);
      }
    }
  }, exports.timeIntervalC2R);

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
  // }, exports.timeIntervalC2R);
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
    current = exports.currCount / exports.timeIntervalC2R;
    oneMin = exports.count / 60000;

    // print to both the console and the output file
    console.log("DHT applied = " + exports.applyDHT);
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
  }, exports.timeIntervalC2R);
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
      var emitSend = function() {
  
          timeElapsed = (new Date().getTime() - start).toString();
          // choose what type of request to (randomly) "make". we pick a random key
          var randRequest = cRing.keys[Math.floor(Math.random() * cRing.keys.length)];
          // print to the console
          console.log(randRequest.dat.reqType + " requested by: " + currNode.client.id + ", TIME: " + timeElapsed);
          // find the responsible node and using the requesting node itself and its finger table, 
          
          // **************************************************************
          // **************************************************************
          // fairly certain this is the issue for the maximum stack calls, but not sure how to fix it
          // **************************************************************
          // **************************************************************
          // refer to line 342 in ring.js
          //var respNode = setTimeout( function() {cRing.findFingerTable(randRequest.ID, currNode, currNode); }, 100);
          var respNode = cRing.findFingerTable(randRequest.ID, currNode, currNode);
          console.log("Average Hop Count for Node # " + currNode.nodeID + " : " + currNode.hopAverage);
          exports.stream.write("Average Hop Count for Node # " + currNode.nodeID + " : " + currNode.hopAverage + "\r\n");
          // identify which element in the key array of the responsible Node is our key
          // set it equal to a random character, since we know it should be a number
          var index = "a";
          for (var c = 0; c < respNode.key.length; c++) {
            if (respNode.key[c].key.ID == randRequest.ID) {
              index = c;
              break;
            }
          }
          // check if the data that the node has is expired. if not, then we need not worry about it
          // and just send that back.
          // only do this if we have found the index. (we should have)
          if (index != "a") {
            // if the expireTime is zero (Default at declaraction of the caches)
            // then set it to 5000 after the current time
            if (respNode.key[index].expireTime == 0) {
              respNode.key[index].expireTime = timeElapsed + 5000;
            }
             else if (respNode.key[index].expireTime < timeElapsed) {
              // add the current node's id to the list of requests that the responsible node received
              respNode.recipients.push(clientjs.logInfo(currNode, timeElapsed, randRequest.id)); 
            }
          }
          // save to each client's personal request log
          currNode.client.reqs.push(randRequest.reqType);
          currNode = currNode.cw;
          
          return new relation(currNode.nodeID, randRequest.ID, respNode.nodeID);
        }

        // call the function declared above
        emitSend();
    } while (currNode != cRing.head);
  }, exports.timeIntervalC2R);

  // at each timer interval, send requests to the server
  exports.sendReqFuncChord = setInterval(function () {
    // start at the head of the ring structure
    var currNode = cRing.head; 
    // and for all the nodes.. 
    do {
      // and all the keys each node is responsible for..
      for(var i = 0; i < currNode.key.length; i++) {
        // set up the options needed to make the request
        var options = {
          uri: "http://localhost:" + Configuration.port + "/",
          // default to GET
          method: currNode.key[i].key.dat.reqType,
          body: ""
        }
        // find the time at which we make the request.
        // for this program's purposes, we can base it all off of the time when we make
        // the request, instead of when the responsible node gets the response back
        // since we dont actually care about the response
        // we only want to measure server load
        var timeElapsed = (new Date().getTime() - start).toString();
        // make the actual request
        clientjs.makeReq(options); //, currNode.key[i].key.dat, timeElapsed);
        // and update the expire time of the data object
        currNode.key[i].expireTime = timeElapsed + 5000;
      }
      // reset the recipients array for the next round
      currNode.recipients = [];
      currNode = currNode.cw;
    } while (currNode != cRing.tail);
  }, exports.timeIntervalR2S );
}

// stop the communication
exports.stopAction = function() {
  // if we were applying DHT..
  if (exports.applyDHT) {
    clearInterval(exports.reqFuncChord);
    clearInterval(exports.sendReqFuncChord);
  }
  // if we were not applying DHT..
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

// =============================================================== //

exports.countNode = function() {
  var current = cRing.head;
  var count = 1;
  while (current != cRing.tail) {
    count++;
    current = current.cw;
  }
  return count;
}

// wrapper function for a random join of a new node
exports.joinRand = function() {
  console.log('where is it getting stuck?');
  var c = exports.countNode();
  console.log('HERES THE OLD COUNT ' + c);
  console.log('HERES THE OLD COUNT ' + c);

console.log('HERES THE OLD COUNT ' + c);

console.log('HERES THE OLD COUNT ' + c);

console.log('HERES THE OLD COUNT ' + c);

console.log('HERES THE OLD COUNT ' + c);

  // 100 is an arbitrary number i just made up
  var newClient = new clientjs.Client(Math.floor(Math.random() * 100));
  var knownNode = cRing.getCW(Math.floor(Math.random() * cRing.maxID));
  cRing.join(newClient, knownNode);
  exports.joinCount += 1;

  c = exports.countNode();
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);
  console.log('HERES THE new COUNT ' + c);

}

// wrapper function for a random leave of a node on the ring
exports.leaveRand = function() {
  var knownNode = cRing.getCW(Math.floor(Math.random() * cRing.maxID));
  cRing.leave(knownNode.nodeID);
  exports.leavecount += 1;
}

// wrapper function for stabilizing the ring
exports.refreshRing = function() {
  cRing.stabilize();
}
