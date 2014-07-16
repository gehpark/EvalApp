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

// create instances of Client for each client
for (var i = 0; i < numClients; i++) {
  // and add to the array
  clients.push(new clientjs.Client(i));
}

// link the initial links of the ring structure together
for (var c in clients) {
  // set the succeeding element in the ring to be the
  // following one in the clients list
  clients[c].cw = clients[(c + 1) % clients.length];  
  // set the preceding element in the ring to be the
  // leading one in the clients list
  clients[c].ccw = clients[(c - 1) % clients.length]; 
}

// create the node prototype. this is the structure that will represnet
// each node in the ring structure for the chord algorithm.
function node() {
  // the client that is the node
  this.client = null;
  // node id that is given to the node itself
  this.nodeID = null;
  // cw and ccw are the fields for the predeccesor and
  // successors of the particular node on the ring structure. 
  this.cw = null;
  this.ccw = null;
  // the key that this node is responsible for sending. may be null
  this.key = null; 
  // the array of the clients who have sent to this node a request
  this.recipients = [];
  // part of the chord algorithm
  this.fingerTable = [];
  // each node should remember a few (m/2, lets say for now) 
  // successors and predecessors in case the immediate relations fail.
  this.successorsList = [];
  this.predeccesorsList = [];
}

function key(requestType) {
  // the data that is this node
  this.data = null;
  // the id that is given to this key. same space as nodeIDs
  this.ID = null;
}

// create a new key for each data object
// and add it to the array of keys
for (var i in clientjs.requests) {
  keys.push(new key(clientjs.requests[i]));
}

// this function tests whether a <= b <= c. 
// used to implement the finger table search method
var isBetween = function(a, b, c, maxID) {
  // if the first bound is smaller than the second 
  if(a < c) {
    // compare and return appropriate boolean
    if (a <= b && b >= c) {
      return true;
    }
    else {
      return false;
    }
  }
  // if the first bound is larger than the second, it means we are
  // crossing over the maxID and starting over on the ring.
  // so we can add the maxID to compare. this should only happen
  // at maximum once per finger table
  else {
    if (a <= b && b >= c+maxID) {
      return true;
    }
    else {
      return false;
    }
  }
}

// this prototpe defines the structure of the ring that we will need to
// use for the chord algorithm. the input is an integer m which determines
// the max size of the ring. we can have at maximum 2^m nodes
function ring(m) {
  // marks the head of the ring
  this.head = null;
  // and the tail
  this.tail = null;
  // this is the largest ID value that the nodes on this ring can have
  this.maxID = 2^m - 1;

  // this function finds the first empty slot in which we can place a
  // new node and places it there, stabilizing by updating the
  // successors and predecessors.
  this.placeInSlotOld = function(newNode) {
    // keep track of whether the node has been placed or not yet
    var placed = false;
    // if there are no nodes in the ring add this as both head and tail
    if (this.head == undefined && this.tail == undefined) {
      this.head = newNode;
      this.tail = newNode;
      newNode.cw = newNode;
      newNode.ccw = newNode;
      placed = true;
    }
    // if there is at least one element in the ring...
    else if (this.head != undefined) {
      // if there is space from ID 0 to the head of the ring, place it there
      if (this.head.nodeID > 0) {
        newNode.cw = this.head;
        newNode.ccw = this.tail;
        newNode.nodeID = this.head.nodeID - 1;
        placed = true;
        this.head = newNode;
      }
      // if there is only one element in the ring..
      else if (this.head === this.tail) {
        this.tail = newNode;
        newNode.cw = this.head;
        newNode.ccw = this.head;
        placed = true;
      }
      // if not, we want to traverse through the rest of the ring
      else {
        // start with the head
        var current = this.head;
        // until we have reached the end of the nodes
        while (current != this.tail) {
          // if there is a gap between two nodes, place it there
          if (current.nodeID - current.cw.nodeID > 1) {
            newNode.cw = current;
            newNode.ccw = current.ccw;
            newNode.nodeID = current.nodeID + 1;
            placed = true;
            break;
          }
          // if there is no gap, move onto the next node
          else {
            current = current.cw;
          }
        }
        // if the node still has not been placed and there is space after 
        // the tail of the ring, place it at the end 
        if (placed === false && this.tail.nodeID < this.maxID) {
          newNode.cw = this.head;
          newNode.ccw = this.tail;
          newNode.nodeID = this.tail.nodeID + 1;
          placed = true;
          this.tail = newNode;
        }
      }
    }
    // return the status of the placement
    return placed;
  }

  this.loop = function(f) {
    var current = this.head; 
    // do this for all nodes
    do {
      this.f(current);
      current = current.cw;
    // stop the loop when we have reached our last node
    } while (current != this.tail)
  }

  // assign IDS to data(keys) and clients(nodes)
  this.assignIDs = function(keysList) {
    // TODO SHA-1
    // we want to keep track of the smallest id to 
    // set it as the head node
    var minNodeID = 2^m - 1;
    for (var i = 0; i < 2^m; i++) {
      
    }
    return minNodeID;
  }

 // this function 
  this.assignKeysToNodes = function() {
    for (var k in keys) {
      keys[k].responsibleNode = this.getCW(keys[k].ID);
    }
  }

  // 
  this.setUp = function() {
    var min = this.assignIDs(keys);
    // DO STUFF WITH THE NODES
    assignKeysToNodes();
  }

 
  // this function taks in a node and builds the successor and 
  // predecessor lists of that node
  this.buildSuccessorsPredecessorsList = function(nd) {
    // variables to keep track as we move away from the input node
    var nextCW = nd;
    var nextCCW = nd;
    // make the array size m/2
    for(var i = 0; i < m/2; i++) {
      // add successor and increment
      nd.successors.push(nextCW.cw);
      nextCW = next.cw;
      // and predecessor and increment
      nd.predeccessors.push(nextCCW.ccw);
      nextCCW = next.ccw;
    }
  }

  // this function returns the first node encountered after a given ID
  this.getCW = function(ID) {
    var current = ID;
    // try getting the node at the given ID
    var successor = getNode(ID);
    // if we couldnt get one, we want to find the node closest to it
    while (successor != undefined) {
      // so we iterate until we get a node
      current += 1;
      successor = getNode(current); 
    }
    return successor;
  }

  // this function builds the finger tables for all the nodes in the ring
  this.buildFingerTable = function(nd) {
      // and each finger table should have m entries
      for (var i = 0; i < m; i++) {
        // the finger table id may be greater than the maxID; so use mod
        var ndID = (nd.nodeID + 2^i)%2^m;
        // add the tuple of the id and the following node to the fingertable
        nd.fingerTable.push([ndID, this.getCW(ndID)]);
      }
  }

  // this function finds what element of the finger table should be referenced
  this.findFingerTable = function(inputID, nd) {
  for (var i = 0; i < m-1; i++) {
      if (isBetween(nd.fingerTable[i][0], inputID, nd.fingerTable[i+1][0])) {
        return nd.fingerTable[i];
      }
      else {
        // forward this problem to the successor and see if that one can 
        // locate where the input node should go
        this.findFingerTable(inputID, nd.cw);
      }
    }
  }

  // this function places a new node where it belongs
  // by the Chord algorithm method, the node must know at least one other node
  // that already is on the ring.
  this.put = function(newNode, nd) {
    // find the successor of the new node that we want to add
    var place = findFingerTable(newNode.nodeID, nd);
    // update the successors and predecessors of the new node
    newNode.cw = place;
    newNode.ccw = place.ccw;
    // and same for the successors and predecessors themselves
    place.ccw = newNode;
    newNode.cw = newNode;
  }

  // this function returns the node that corresponds to the input node id
  // if it exists
  this.getNode = function(nodeID) {
    // start at the head of the ring
    var current = this.head;
    // and traverse until we get to the tail
    while (current != this.tail) {
      // check that the node id is correct
      if (current.nodeID === nodeID) {
        // if yes, return the node
        return current;
      }
    }
    return null;
  }

  // update the predecessors and successors for the ring structure
  // when a node leaves
  this.leave = function (nodeID) {
    // get the node object from the ring
    var node = this.getNode(nodeID);
    node.cw.ccw = node.ccw;
    node.ccw.cw = node.cw;
  }

  // update the predecessors and successorts for the ring structure
  // when a node joins
  this.join = function (object,nd) {
    if (object.type == client) {
      // add the input client instance to the array of all our clients
      clients.push(client);
    }
    // create a node element and add to the ring structure
    this.put(new node(object), nd);
  }

  // this function stabilizes the whole ring in case some nodes failed
  this.stabilize = function() {
    // keep track of which node we are observing
    var current = this.head;
    // go through the whole ring until we get to the tail
    while(current != this.tail) {
      // if the successor failed
      if (!current.cw.client) {
        for(var i = 1; i < m/2; i++) {
          var newCW = current.successors[i];
          i++;
          if (newCW) {
            // replace the successor with the new working one
            current.cw = newCW;
            break;
          }
        }
      }
      // if the predeccessor failed
      if (!current.ccw.client) {
        for(var i = 1; i < m/2; i++) {
          var newCCW = current.predeccessors[i];
          i++;
          if (newCCW) {
            // replace the successor with the new working one
            current.ccw = newCCW;
            break;
          }
        }
      }
    }
  }

}

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
// create and set up the ring
var cRing = new ring(4);
cRing.assignIDs(keys);
cRing.assignKeysToNodes();
cRing.loop(cRing.buildFingerTable);
cRing.loop(cRing.buildSuccessorsPredecessorsList);

// stabilize the ring every x seconds?
// var function = setInterval(cRing.stabilize(), 10000); 
// ============================= TIMER SET UP ============================= //

// set the duration for which we want the simulation to run
var maxTime = 5000;

// save the start time
var start = new Date();

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
  randRequest.representative.reqs.push("From: " + clients[c].id + " at time: " + timeElapsed);
  // increment the request counter
  randRequest.representative.reqCounter++;
}

// this function starts the sending of the requests from the clients
exports.action = function() {
  // since it is an exported function, we want to include request here.. 
  var request = require("request");
  //// use below for GUI stuff to display console
  // var doc = document.open()
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
          body: "words with no meaning"
        }
        clientjs.makeReq(options);
      }
    }
  }, timerInterval);

  // at each timer interval print out server stats
  exports.statFunc = setInterval(function() {
    // log the current time
    var timeElapsedStat = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed at stat check: " + timeElapsedStat + "\r\n");
    
    var dataJSON = stats.toJSON();
    var test = dataJSON.mean;
    // get the server data & log
    console.log(dataJSON);
    var splitdata = JSON.stringify(dataJSON).split(',');
    var entry = new dataEntry(splitdata);
    // add on the type of count that we want to our data array
    // right now we are keeping track of the mean # of requests
    timeData.push(new timeDataPair(timeElapsedStat, entry.mean));
    // save the data onto the output file
    for (var i = 0; i < splitdata.length; i++) {
        exports.stream.write(splitdata[i] + "\r\n");
      }
  }, timerInterval);
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

// stop the communication
exports.stopAction = function() {
  clearInterval(exports.reqFunc);
  clearInterval(exports.sendReqFunc);
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
