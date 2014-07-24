// ================================ CLIENTS ================================ //

// use the request package to send fake requests
var request = require("request");

//create a client prototype
exports.Client = function(id) {
  // give it its unique id
  this.id = id;
  // create an array to hold all its requests
  this.reqs = [];
  this.type = "client";
  this.gatherKey = [];
  this.reqCounter = 0;
};

// create a data prototype
exports.Data = function(reqType) {
  this.type = "data";
  this.body = null;
  this.reqType = reqType;
  // client that this request should be forwarded to
  this.representative = null;
}

// create a prototype for a log info to store
// type of request and the time at which it was received
exports.logInfo = function(from, time) {
  this.from = from;
  this.time = time;
  this.data = null;
}

// this is the array of requests that the clients can make
var requestNames = ["HEAD", "PUT", "DELETE", "OPTIONS", "GET"];
// comment these out because they, as fake requests, cause the socket to 
//  hang up.
//["PORT",0], ["CONNECT",0], 

// create a list of data objects to hold the requests
exports.requests = [];

// create new data objects for each request type and add to array
for (var r in requestNames) {
  exports.requests.push(new exports.Data(requestNames[r]));
}

// makes the request
exports.makeReq = function (options) {
	var r = request(options, function(error, res, body) {
      if (error !== null) {
        console.log(error);
      }
  });
};

// choose what type of request to (randomly) "make"
exports.randReq = function () {
	return exports.requests[Math.floor(Math.random() * exports.requests.length)];
};

// this function resets all the fields of a client
exports.resetClients = function() {
  this.reqs = [];
  this.reqCounter = 0;
  this.gatherKey = [];
}
