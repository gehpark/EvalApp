<!DOCTYPE html>
<html>
  <head>
    <title> Evaluation Application </title>

    <link href="http://s3.amazonaws.com/codecademy-content/courses/ltp/css/shift.css" rel="stylesheet">
    
    <link rel="stylesheet" href="http://s3.amazonaws.com/codecademy-content/courses/ltp/css/bootstrap.css">
    <link rel="stylesheet" href="public/css/style.css">

    <script src="/socket.io/socket.io.js"></script>
    <script src="http://code.jquery.com/jquery-1.11.1.js"></script>
    <script>
      var socket = io();
    </script>
    <script src="http://cdn.peerjs.com/0.3/peer.js"></script>
    <script src="network.js"></script>

    <script>
  // This is a very simple code example. See chat.html for a more involved
  // example.

  $(document).ready(function() {

    // Create a new Peer with our demo API key, with debug set to true so we can
    // see what's going on.
    peer1 = new Peer({ key: 'lwjd5qra8257b9', debug: 3});
    // Create another Peer with our demo API key to connect to.
    peer2 = new Peer({ key: 'lwjd5qra8257b9', debug: 3});

    // The `open` event signifies that the Peer is ready to connect with other
    // Peers and, if we didn't provide the Peer with an ID, that an ID has been
    // assigned by the server.
    peer1.on('open', function(id){
      peerId1 = id;

      var c = peer2.connect(peerId1);
      c.on('data', function(data) {
        // When we receive 'Hello', send ' world'.
        $('#helloworld').append(data);
        c.send(' peer');
      });
    });

    // Wait for a connection from the second peer.
    peer1.on('connection', function(connection) {
      // This `connection` is a DataConnection object with which we can send
      // data.
      // The `open` event firing means that the connection is now ready to
      // transmit data.
      connection.on('open', function() {
        // Send 'Hello' on the connection.
        connection.send('Hello,');
      });
      // The `data` event is fired when data is received on the connection.
      connection.on('data', function(data) {
        // Append the data to body.
        $('#helloworld').append(data);
      });
    });

    // Show browser version
    $('#browsers').text(navigator.userAgent);
  });


</script>

  </head>

  <body>
    <div class="nav">
      <div class="container">
        <ul class = "pull-left">
          <li><a href="/home.html">Mitsubishi Home</a></li>
          <li><a href="/about.html">About</a></li>
        </ul>
        <ul class = "pull-right">
          <li><a href="/index.html">Simulation</a></li>
          <li><a href="/contact.html">Contact</a></li>
          <li><a href="/help.html">Help</a></li>
        </ul>
      </div>
    </div>

    <div class="jumbotron">
      <div class="container">
        <h1>Interactive Web App</h1>
        <p>Run simulations to test the effectiveness of DHTs</p>
        <button onclick=socket.emit('start')>Click to start running! </button>
        <button onclick=socket.emit('stop')>Stop </button>
      </div>
    </div> 
    
  </body>
</html>
