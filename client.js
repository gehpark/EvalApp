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
  this.gatherKey = null;
  this.keyCounter = 0;
};

// this is the array of requests that the clients can make
exports.requests = [["HEAD",0], ["PUT",0], ["DELETE",0], ["OPTIONS",0], ["GET",0]];
// comment these out because they, as fake requests, cause the socket to 
//  hang up.
//["PORT",0], ["CONNECT",0], 

// makes the request
exports.makeReq = function (options) {
	request(options, function(error, res, body) {
      if (error !== null) {
        console.log(error);
      }
  });
};

// choose what type of request to (randomly) "make"
exports.randReq = function () {
	return exports.requests[Math.floor(Math.random() * exports.requests.length)];
};
