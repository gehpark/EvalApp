// =========== MODULES =========== //

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
var serverjs = require("./server");


//var holla = require('holla');


//var d3 = require("d3");

// ========== CLIENT SET UP ============ //

// the port that we want to use
var port = 8111;

// this is the total number of clients
// ++ possible additions add and taking out clients during simulation
var numClients = 10;

// create an array of all the clients that we have
var clients = [];

// create instances of Client for each client
for (var i = 0; i < numClients; i++) {
  // and add to the array
  clients.push(new clientjs.Client(i));
}
// exports.app.set('views', __dirname + '/views');
// exports.app.set('view engine', 'html');
// make the HTTP server listen on our port
exports.http.listen(port, function(){
  console.log('Listening on *:' + port);
});

//var rtc = holla.createServer(exports.http);

exports.app.get('/', function(req, res){
  res.sendfile('index.html');
  stats.meter('requestsPerSecond').mark();
});
// exports.app.engine('.html', require('ejs').__express);
exports.app.use(express.static(__dirname, '/public'));


// ========== TIMER SET UP =========== //

// set the duration for which we want the simulation to run
var maxTime = 5000;

// save the start time
var start = new Date();
var startmil = start.getTime();


// default this variable to false
var isTimerDone = false;

var server = new serverjs.Server();

// ========== OUTPUT SET UP ============ //

// create a file in which we can save our data
exports.stream = fs.createWriteStream("output/" + startmil + ".txt");

// write a little intro for the file
exports.stream.write("Running Simulation for..." + "\r\n");
exports.stream.write("PORT:" + port + "\r\n");
exports.stream.write("Number of Clients: " + numClients + "\r\n");
exports.stream.write("Length of Duration: " + maxTime + "\r\n");
//document.write('hello world!');
//Wscript.Echo('hello world?');
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


// =========== GRAPH ============ //

//var vis = d3.select("#graph").append("svg");


// =========== ACTION ============ //
exports.action = function() {

  var request = require("request");
 
// use below for GUI stuff to display console
 // var doc = document.open()
  // at each timer interval make requests to the server
  var reqFunc = setInterval(function () {
    // log the current time
    var timeElapsed = (new Date().getTime() - start).toString();
    exports.stream.write("Time Elapsed: " + timeElapsed + "\r\n");

    // each client will make a request
    for (var c in clients) {
      clientjs.makeReq(port);
      // choose what type of request to (randomly) "make"
      var randRequest = clientjs.randReq();
      // print to the console
      console.log(randRequest + " requested by: " + clients[c].id + ", TIME: " + timeElapsed);
      // save to each client's personal request log
      clients[c].reqs.push(randRequest);
    };
  }, 1000);

  // at each timer interval print out server stats
  var statFunc = setInterval(function() {
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

exports.stopAction = function() {
  clearInterval(reqFunc);
  clearInterval(statFunc);
}

