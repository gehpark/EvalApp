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
  // the id of the client that is the node
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
  this.placeInSlot = function(newNode) {
    // keep track of whether the node has been placed or not yet
    var placed = false;
    // if there are no nodes in the ring add this as both head and tail
    if (this.head == undefined && this.tail == undefined) {
      console.log("heres the first one!");
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
        console.log("this should be the second!");
        this.tail = newNode;
        newNode.cw = this.head;
        newNode.ccw = this.head;
        placed = true;
      }
      // if not, we want to traverse through the rest of the ring
      else {
        console.log("we have more than 2!");
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

  // 
  this.assignKeys = function() {

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
  this.join = function (client) {
    // add the input client instance to the array of all our clients
    clients.push(client);
    // create a node element and add to the ring structure
    this.placeInSlot(new node(client));
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
console.log('making ring..');
var cRing = new ring(4);
for (c in clients) {
  var g = cRing.placeInSlot(new node(clients[c]));
  console.log(g);
}

// ============================= TIMER SET UP ============================= //

// set the duration for which we want the simulation to run
var maxTime = 5000;

// save the start time
var start = new Date();
var startmil = start.getTime();

// default this variable to false
var isTimerDone = false;


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

// this function starts the sending of the requests from the clients
exports.action = function() {
  // since it is an exported function, we want to include request here.. 
  var request = require("request");
  //// use below for GUI stuff to display console
  // var doc = document.open()
  
  // at each timer interval make requests to the server
  exports.reqFunc = setInterval(function () {
    // log the current time
    var timeElapsed = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed: " + timeElapsed + "\r\n");

    // each client will make a request
    for (var c in clients) {
      clientjs.makeReq(exports.port);
      // choose what type of request to (randomly) "make"
      var randRequest = clientjs.randReq();
      // print to the console
      console.log(randRequest + " requested by: " + clients[c].id + ", TIME: " + timeElapsed);
      // save to each client's personal request log
      clients[c].reqs.push(randRequest);
    };
  }, 1000);

  // at each timer interval print out server stats
  exports.statFunc = setInterval(function() {
    // log the current time
    var timeElapsed = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed at stat check: " + timeElapsed + "\r\n");
    
    var dataJSON = stats.toJSON();
    var test = dataJSON.mean;
    // get the server data & log
    console.log(dataJSON);
    var splitdata = JSON.stringify(dataJSON).split(',');
    var entry = new dataEntry(splitdata);
    // add on the type of count that we want to our data array
    // right now we are keeping track of the mean # of requests
    timeData.push(new timeDataPair(timeElapsed, entry.mean));
    // save the data onto the output file
    for (var i = 0; i < splitdata.length; i++) {
        exports.stream.write(splitdata[i] + "\r\n");
      }
  }, 1000);
}

// stop the communication
exports.stopAction = function() {
  clearInterval(exports.reqFunc);
  clearInterval(exports.statFunc);
}

