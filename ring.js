// load the sha-1 package to use the sha-1 for
// the most effective hashing/randomization
var sha1 = require('sha1')
// create the node prototype. this is the structure that will represent
// each node in the ring structure for the chord algorithm.
function node(client, nodeID) {
  // the client that is the node
  this.client = client;
  // node id that is given to the node itself
  this.nodeID = nodeID;
  // cw and ccw are the fields for the predeccesor and
  // successors of the particular node on the ring structure. 
  this.cw = null;
  this.ccw = null;
  // the key(s) that this node is responsible for sending. may be null
  // list of cache items
  this.key = []; 
  // the array of the clients who have sent to this node a request
  this.recipients = [];
  // part of the chord algorithm
  this.fingerTable = [];
  // each node should remember a few (m/2, lets say for now) 
  // successors and predecessors in case the immediate relations fail.
  this.successorsList = [];
  this.predeccesorsList = [];
  // gather information about the number of hops
  this.hopCounter = 0;
  this.hopAverage = 0;
  this.reqCounter = 0;
}

exports.key = function(data) {
  // the data that is this node
  this.dat = data;
  // the id that is given to this key. same space as nodeIDs
  this.ID = null;
}

var cache = function(key, expireTime) {
  this.key = key;
  this.expireTime = expireTime;
}

var contains = function(list, obj) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] === obj) {
        return true;
    }
  }
    return false;
}

// this function code can be optimized *****
// this function tests whether a <= b <= c. 
// used to implement the finger table search method
var isBetween = function(a, b, c, maxID) {
  // if the first bound is smaller than the second 
  if(a <= c) {
    // compare and return appropriate boolean
    if (a <= b && b <= c) {
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
    if ( (a <= b && b <= maxID) || 
         ( 0 <= b && b<=c ) ) {
      return true;
    }
    else {
      return false;

    }
  }
}

// this prototpe defines the structure of the ring that we will need to
// use for the chord algorithm. the input is an integer m which determines
// the max size of the ring. we can have at maximum Math.pow(2,m) nodes
exports.ring = function(m, clients) {
    this.m = m;
    // marks the head of the ring
    this.head = null;
    // and the tail
    this.tail = null;
    // this is the largest ID value that the nodes on this ring can have
    this.maxID = Math.pow(2,m) - 1;
    // keep track of the keys
    this.keys = [];
    this.taken = [];
  // declare a variable to keep track of stabilization and its progress
  this.stabilizeIndex = 0;
  
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

  // assign IDS to data(keys) and clients(nodes)
  this.assignIDs = function(newNodesList) {
    // while we have not reached the last element
    for (var c in clients) {
      // use SHA-1 to generate a hashed key
      var hex = sha1("C" + clients[c].id);

      // parse into an integer and mod by Math.pow(2,m) to get an ID in our range
      var hash = parseInt(hex, 16) % Math.pow(2,m); 
      // if the id is already taken (this is possible because the hash keys
      // that are being generated are huge numbers, and we only want to
      // mod it by Math.pow(2,m) which may be a very small number) then we opt to
      // the math.random function
      while(contains(this.taken,hash)) {
        hash = Math.floor(Math.random() * Math.pow(2,m));
      }
      // and set the nodeID
      newNodesList.push(new node(clients[c], hash));
      // add it to the list of taken IDs
      this.taken.push(hash);
    }
      
    // assign the keys ids of the same space
    for (var i in this.keys) {
      // use SHA-1 to generate a hashed key
      var hex = sha1("K" + this.keys[i].ID);
      // parse into an integer and mod by Math.pow(2,m) to get an ID in our range
      var hash = parseInt(hex, 16) % Math.pow(2,m);
      // add it to the list of taken IDs
      this.taken.push(hash);
      // try again if its taken
      while(contains(this.taken, hash)) {
        hash = Math.floor(Math.random() * Math.pow(2,m));
      }
      // set the id       
      this.keys[i].ID = hash;
    }
      
  }

    //
    //
    // Correction: the keys do not store which nodes are responsible for them..
    //
    // 
 // this function works with all the keys (types of requests in our case) 
 // that we have and assigns it to the first node (client) that it encounters
  this.assignKeysToNodes = function() {
    // for each key in our array of keys
    for (var k in this.keys) {
      // set the representative field to the result that we get after calling
      // getCW of the id of the current key
      var rep = this.getCW(this.keys[k].ID);
      //this.keys[k].dat.representative = rep;
      rep.key.push(new cache(this.keys[k], 0));
    }
  }

  // helper function for the setUp function
  // compares two nodes to sort the array of nodes by their id
  function compareID(a,b) {
    if (a.nodeID < b.nodeID)
      {return -1;}
    if (a.nodeID > b.nodeID)
      {return 1;}
    return 0;
  }

  // this is the function that sets up the initial structure for the
  // chord algorithm. this does not make use of join or put, because
  // this will be called before the finger tables are built. 
  this.setUp = function(newNodesList) {
      this.assignIDs(newNodesList);
      if (newNodesList.length < 1) {
        // we should have at least one node!!
        return null;
      }
         
    // organize the clients by their id
    newNodesList.sort(compareID);
    // set the first element in the array to be the head of the ring
    this.head = newNodesList[0];
    // connect each element to each other
    for (var c = 0; c < newNodesList.length; c++) {
      // use modulo here to connect the tail and head together
      newNodesList[c].cw = newNodesList[(c+1) % newNodesList.length];
      newNodesList[(c+1) % newNodesList.length].ccw = newNodesList[c];
    }
    // set the last element in the array to be the tail of the ring
    this.tail = newNodesList[newNodesList.length - 1];
    // now that we have the nodes set up, assign the keys to their
    // representative nodes
    this.assignKeysToNodes();
    
  }

  // this function returns the node that corresponds to the input node id
  // if it exists
  this.getNode = function(nodeID) {
    // start at the head of the ring
    var current = this.head;
    // while (current != this.tail) {
    //   console.log("this too " + current.nodeID);
    //   current = current.cw;
    // }
    // and traverse until we get to the tail
    do {
      //console.log("stcu");
      // check that the node id is correct
      if (current.nodeID == nodeID) {
        // if yes, return the node
        return current;
      }
      else {
        //console.log("def not " + current.nodeId);
        current = current.cw;
      }
    }while( current != this.head );
    return "null";
  }

  // this function returns the first node encountered after a given ID
  this.getCW = function(ID) {
    var current = ID;
    // try getting the node at the given ID
    var successor = this.getNode(ID);
    // if we couldnt get one, we want to find the node closest to it
    while (successor == "null") {
      // so we iterate until we get a node
      current = (current + 1) % Math.pow(2,m);
      successor = this.getNode(current); 
    }
    return successor;
  }

  // this function takes in a node and builds the successor and 
  // predecessor lists of that node
  this.buildSuccessorsPredecessorsList = function(nd) {
    var nextCW = nd;
    var nextCCW = nd;
    // make the array size m/2
    for(var i = 0; i < m/2; i++) {
      // add successor and increment
      nd.successorsList.push(nextCW.cw);
      nextCW = nextCW.cw;
      // and predecessor and increment
      nd.predeccesorsList.push(nextCCW.ccw);
      nextCCW = nextCCW.ccw;
    }
  }

  this.buildSuccessorsPredecessorsListAll = function() {
    var current = this.head;
    // do this for all nodes
    do {
      this.buildSuccessorsPredecessorsList(current);
      current = current.cw;
    // stop the loop when we have reached our last node
    } while (current != this.head)
  }

  // this function builds the finger tables for all the nodes in the ring
  this.buildFingerTable = function(nd) {
      // and each finger table should have m entries
      for (var i = 0; i < m; i++) {
          // the finger table id may be greater than the maxID; so use mod
          var ndID = (nd.nodeID + Math.pow(2,i)) % Math.pow(2,m);
          // add the tuple of the id and the following node to the fingertable
          nd.fingerTable.push([ndID, this.getCW(ndID)]);
      }
  }
  this.buildFingerTableAll = function() {
    var current = this.head; 
    // do this for all nodes
    do {
      this.buildFingerTable(current);
      current = current.cw;
    // stop the loop when we have reached our last node
    } while (current != this.head)
  }

    /*
    * @note this function finds what element of the finger table should be referenced
    * 
    * @param [in] inputID   ID for searching a key or a node
    * @param [in] nd        a node of current search
    * @param [in] hopNode   an original node which wants to find a key or a node with inputID
    **/
    this.findFingerTable = function(inputID, nd, hopNode) {

      // Check to see if the input id is between the known node and the known node's successor
      if( isBetween( nd.nodeID, inputID, nd.fingerTable[0][1].nodeID, this.maxID ) )
      {
        // if so, return the known node's successor
          return nd.fingerTable[0][1]; 
      }
      
      // check to see if the input id is within finger table reach of the known node
      for (var i = 0; i < m-1; i++) {
        // everytime we hop, increment the counter
        hopNode.hopCounter++;
        // check to see if the input id is within the range of the fingers of the
        // specified node's finger table on the ith row
        if (isBetween(nd.fingerTable[i][1].nodeID, inputID, nd.fingerTable[i+1][1].nodeID, this.maxID)) {
            // recalculate the new average for this node and update
            hopNode.hopAverage = (hopNode.hopCounter + hopNode.hopAverage * hopNode.reqCounter) / (hopNode.reqCounter + 1);
            // reset to 0 for the next request
            hopNode.hopCounter = 0;
            // increment total number of requests
            hopNode.reqCounter++;
            // if so, return the successor
            return nd.fingerTable[i+1][1];
        }
      }
      // forward this problem to the successor and see if that one can 
      // locate where the input node should go
      return this.findFingerTable(inputID, nd.fingerTable[m-1][1], hopNode);
  }

  // this function places a new node where it belongs
  // by the Chord algorithm method, the node must know at least one other node
  // that already is on the ring.
  this.put = function(newNode, nd) {
    // find the successor of the new node that we want to add
    var place = this.findFingerTable(newNode.nodeID, nd, nd);
    // update the successors and predecessors of the new node
    newNode.cw = place;
    newNode.ccw = place.ccw;
    // and same for the successors and predecessors themselves
    place.ccw = newNode;
    place.ccw.cw = newNode;
  }

// this function updates one row or layer of the pred., succ., and finger tables. 
  this.steadyUpdateTables = function() {
    // start at the head of the circle
    var current = this.head;

    // these are just setting up for the pred/succ table updates
    var pred = current;
    var succ = current;
    for (var i = 0; i < this.stabilizeIndex; i++) {
      pred = pred.ccw;
      succ = succ.cw;
    }
    pred = pred.ccw;
    succ = succ.ccw;

    // traverse through the nodes
    while(current != this.tail) {
      // update the finger table one row at a time. we keep track of which row
      // we are updating with the stabilizeIndex variable
      // the finger table id may be greater than the maxID; so use mod
      var ndID = (current.nodeID + Math.pow(2,this.stabilizeIndex)) % Math.pow(2,m);
      // add the tuple of the id and the following node to the fingertable
      current.fingerTable[this.stabilizeIndex] = [ndID, this.getCW(ndID)];

      // add successor and increment
      pred = pred.cw
      current.successorsList[this.stabilizeIndex] = pred;
      ;
      // and predecessor and increment
      succ = succ.cw;
      current.predeccesorsList[this.stabilizeIndex] = succ;
      
      // increment the stabilize index
      this.stabilizeIndex = (this.stabilizeIndex + 1) % this.m;

      // move onto the next node
      current = current.cw;
    }
  }


  // update the predecessors and successors for the ring structure
  // when a node leaves
  this.leave = function (nodeID) {
    // get the node object from the ring
    var node = this.getNode(nodeID);
    // find out which node we have to modify 
    var nodeToEdit = node.cw;
    // update the doubly linked lists
    node.cw.ccw = node.ccw;
    node.ccw.cw = node.cw;

    this.steadyUpdateTables();

    // add the keys that this node was responsible for onto its successor  
    for (var c = 0; c < node.key.length; c++) {
      nodeToEdit.key.push(node.key[c]);
    }
  }

  // update the predecessors and successors for the ring structure
  // when a node joins
  this.join = function (client, nd) {
    // determine what the id will be
    var hex = sha1("C" + client.id);
    var hash = parseInt(hex, 16) % Math.pow(2,m); 
    while(contains(this.taken,hash)) {
      hash = Math.floor(Math.random() * Math.pow(2,m));
    }
    // add it to the list of taken IDs
    this.taken.push(hash);
    // create a node element and add to the ring structure
    var newNode = new node(client,hash);
    this.put(newNode, nd);
    
    this.steadyUpdateTables();

    // find out which node will be affected
    var nodeToEdit = this.getCW(hash);
    // save the list of keys that this node is responsible for
    var availableKeys = nodeToEdit.key;
    // clear out the keys it is responsible for
    nodeToEdit.key = [];
    // determine which node is now responsible for it and add it to 
    // the approprifate key list
    for (var c = 0; c < availableKeys.length; c++) {
      if (availableKeys[c].ID < hash) {
        newNode.key.push(availableKeys[c]);
      }
      else {
        nodeToEdit.key.push(availableKeys[c]);
      }
    }    
  }

  // edit finger tables, successor/predecessor lists, key list
  // this function stabilizes the whole ring in case some nodes failed
  this.stabilize = function() {
    // keep track of which node we are observing
    var current = this.head;

    // these are just setting up for the pred/succ table updates
    var pred = current;
    var succ = current;
    for (var i = 0; i < this.stabilizeIndex; i++) {
      pred = pred.ccw;
      succ = succ.cw;
    }
    pred = pred.ccw;
    succ = succ.ccw;
    
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

      // update the finger table one row at a time. we keep track of which row
      // we are updating with the stabilizeIndex variable
      // the finger table id may be greater than the maxID; so use mod
      var ndID = (current.nodeID + Math.pow(2,this.stabilizeIndex)) % Math.pow(2,m);
      // add the tuple of the id and the following node to the fingertable
      current.fingerTable[this.stabilizeIndex] = [ndID, this.getCW(ndID)];

      // add successor and increment
      pred = pred.cw
      current.successorsList[this.stabilizeIndex] = pred;
      ;
      // and predecessor and increment
      succ = succ.cw;
      current.predeccesorsList[this.stabilizeIndex] = succ;
      
      // increment the stabilize index
      this.stabilizeIndex = (this.stabilizeIndex + 1) % this.m;
      // clear the list of keys this node is responsible for
      // we will repopulate this array later
      current.key = [];  
      // move onto the next node
      current = current.cw;
    }
  }
  // reassign the keys to the nodes
  this.assignKeysToNodes();
      
      /*
      * @note Output Ring Information
      * 
      */
    this.ConsoleOutRingData = function() {
        var  l_Current = this.head;
        
        //loop from head to tail
        while(l_Current != this.tail) {
            
            //print out node information
            console.log( "Current Node: " + l_Current.nodeID );
            
            //print out a key ID
            for(var i=0; i<l_Current.key.length; i++)
            {
                console.log( "key ID: " + l_Current.key[i].key.ID ); 
            }
            //update a variable
            l_Current = l_Current.cw;
        }
    }
}
