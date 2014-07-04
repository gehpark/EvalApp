// ========== CLIENTS =========== //

// use the request package to send fake requests
var request = require("request");

//create a client prototype
exports.Client = function(id) {
  // give it its unique id
  this.id = id;
  // create an array to hold all its requests
  this.reqs = [];
};

// this is the array of requests that the clients can make
exports.requests = ["HEAD", "PUT", "DELETE", "OPTIONS", "CONNECT", "PORT", "GET"];

// makes the request
exports.makeReq = function (port) {
	request("http://localhost:" + port + "/", function(error, response, body) {
      if (error !== null) {
        console.log(error);
      }
  });
};

// choose what type of request to (randomly) "make"
exports.randReq = function () {
	return exports.requests[Math.floor(Math.random() * exports.requests.length)];
};


exports.connectRTC = function() {

}
