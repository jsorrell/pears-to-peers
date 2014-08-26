/***server.js****/
//TODO: change deletePlayer and add exit room function, delete empty rooms
//TODO: support custom usernames, not just socket.id
//TODO: standardize format of messages
//TODO: GameManager should be a component passed to the RoomManager, defined in separate file
        // rename current GameManager to be ServerManager

var consts = {
    minPlayers : 3
};

//external packages
var WebSocketServer = require('ws').Server;
var Message = require('./message'); //find in current directory

var iolog = function() {};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === "-debug") {
    iolog = function(msg) {
      console.log(msg);
    };
    console.log('Debug mode on!');
  }
}

/****START THE SERVER****/
console.log("STARTING SERVER ON PORT 8080");
var serverManager = new ServerManager(8080);
attachServerManagerEvents(serverManager);
/************************/

//OBJECTS:

             /********/
             /*Player*/
             /********/

//DESCRIPTION: Represents a player within a room

//CREATOR:
function Player(playerId, socket) {
//DATA MEMBERS:
    this.socket = socket;
    this.started = false;
    this.playerId = playerId;

//ACCESSORS
    this.getSocket = function(){
        return socket;
    }
}

           /*************/
           /*RoomManager*/
           /*************/
           
//DESCRIPTION: Represents and manages a game room

//CREATOR:
function RoomManager(roomId) {
//DATA MEMBERS:
    this.roomId           = roomId;
    this.events           = {};
    this.playerInfo       = {}; //Map of player objects by ID
    this.playerIds        = [];
    this.numPlayers       = 0;
    this.numStarted       = 0; //number of players who have sent "start" signals
    this.gameStarted      = false;  
    this.leaderId         = "";
    this.leaderIndex      = 0;
    this.leaderCandidates = []; 
    this.timeout          = {};
    this.gameManager      = {};
    
//MANIPULATORS:
    this.on = function(eventName, callback){
              this.events[eventName] = callback;
          };
          
    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        console.log("CALLING FIRE ON " + msg.eventName);
        var event = this.events[msg.eventName];
        event.call(this, msg, socket); //call on this roomManager object
    }
    
    //Function that handles Events for this room

                        
    this.addPlayer = function(playerId, socket){
        if(this.gameStarted){
           return; //send messages warning already started
        }
        
        this.playerInfo[playerId] = new Player(playerId, socket);
        this.playerIds.push(playerId);
        this.numPlayers += 1;
    }
    
    this.deletePlayer = function(playerId){
        var exist = playerId in room.playerInfo;
        
        if (exist) {
            var player = playerInfo[playerId];
              if(player.started){
                  this.numStarted -= 1;
              }
              
              delete this.playerInfo[playerId];
              this.numPlayers -= 1;
              
              //tell everyone this player has been deleted
              for (var peer in room) {
                var soc = this.getSocket(peer);
                soc.send(JSON.stringify({
                  "eventName": "remove_peer_connected",
                  "data": {
                    "socketId": playerId
                  }
                }), function(error) {
                  if (error) {
                    console.log(error);
                  }
                });
              }
        }
   }

   this.addCandidate = function(playerId){
       this.leaderCandidates.push(playerId);
   }
//ACCESSORS:
   this.checkGameStarted = function(){
       return this.gameStarted;
   }
   
   this.getPlayer = function(playerId){
       return this.playerInfo[playerId];
   }
   
   this.getSocket = function(playerId){
       return this.playerInfo[playerId].getSocket();
   }
   
   this.getNumPlayers = function(){
       return this.numPlayers;
   }
};

function attachRoomManagerEvents(roomManager) {
    roomManager.on('joinRoom', function(data, socket) {
    console.log("Player joined room");
    iolog('join_room');
    
    var roomId = data.getRoomId();
    var response = new Message.Message();
    
    if(this.gameStarted){
        response.setEventName("Game already started!");
        socket.send(JSON.stringify(response));
        return;
    }
 
    if(socket.id in this.playerInfo){
        response.setEventName("Player already in room!");
        socket.send(JSON.stringify(response));
        return;
    }
    
    this.addPlayer(socket.id, socket);
    var joinConfirm = new Message.Message;
    joinConfirm.setMessageType("RoomMessage");
    joinConfirm.setEventName("joinedRoom");
    joinConfirm.setRoomId(roomId);
    socket.send(JSON.stringify(joinConfirm));
    
    var room = serverManager.roomInfo[roomId];
    var playerIds = this.playerIds;
    var connectionsId = [];
    
    for(var id in playerIds) {
        console.log("Player %s is in the room", playerIds[id]);
        connectionsId.push(playerIds[id]);
    }
    
    for(var id in playerIds){
        // send new peer a list of all peers
        response.setMessageType("RoomMessage");
        response.setEventName("peerList");
        response.setPeerList(connectionsId);
        var clientConn = room.getSocket(playerIds[id]);
        clientConn.send(JSON.stringify(response));
    }
  })
  
  roomManager.on('startGame', function(data, socket){ //TODO: change number of players when one dies
      console.log('start_game');
      iolog('start_game');
        
      var roomId = data.getRoomId(); //room is roomID
      var playerId = socket.id;
      var response = new Message.Message();
        
      if(!this.playerInfo[playerId].started){
          this.playerInfo[playerId].started = true; //TODO: put this in StartPlayer() call returning true when game started
          this.numStarted += 1;
          var numPlayers = this.getNumPlayers();
          if(this.numStarted == numPlayers && numPlayers >= consts.minPlayers){
              console.log("STARTING GAME!");
              this.gameStarted = true; 
              this.gameManager = new GameManager(this.playerInfo, 
                                                 this.playerIds);
              
              attachGameManagerEvents(this.gameManager);
              response.setMessageType("RoomMessage");
              response.setEventName("startGame");
              finalResponse = JSON.stringify(response);
              for(var player in this.playerInfo){
                  var soc = this.getSocket(player);
                  soc.send(finalResponse);
              }

              this.gameManager.run();
          }
      }else{
          return;
      }//TODO: let server handle mapping user->room later 
  })
}  
  
RoomManager.prototype.handleMsg = function(msg, socket) {
    if (msg.getMessageType() == "GameMessage") {
        this.gameManager.handleMsg(msg, socket);
    } else {
        this.fire(msg, socket);
    }
}


           
           /*************/
           /*GameManager*/
           /*************/
           
function GameManager(playerInfo, playerIds){
//DATA MEMBERS:

//A map from gameState to objects that hold callbacks for various events.
    this.events = {};
    this.playerInfo       = playerInfo; //Map of player objects by ID
    this.playerIds        = playerIds;
    this.leaderIndex      = 0;
    this.scores           = {};
    for (player in playerIds) {
        this.scores[playerIds[player]] = 0;
    }
    this.gameState        = GameManager.gameStates.ELECT_LEADER;
    //MANIPULATORS:

    //register callbacks based on gameState and event name
    this.on = function(eventName, callback){
                  this.events[eventName] = callback;
              };
              
    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        console.log("CALLING FIRE ON " + msg.eventName);
        var event = this.events[msg.eventName];
        event.call(this, msg, socket); //call on this roomManager object
    }
}
//TYPES:
    
//List of Game Stages
GameManager.gameStates = {
    ELECT_LEADER : 0,
    CHOOSE_TOPIC: 1,
    SUBMISSION_PERIOD: 2,
    CHOOSE_WINNER: 3,
    INTERMISSION: 4
};

GameManager.timeouts = {
    ELECT_LEADER : 1,
    CHOOSE_TOPIC : 10,
    SUBMISSION_PERIOD : 20,
    CHOOSE_WINNER : 10,
    INTERMISSION : 5,        
};
   
GameManager.prototype.run = function() {
    var gameStates = GameManager.gameStates;
    var that = this;
    
    if (this.gameState == gameStates.ELECT_LEADER){
        console.log("ELECT_LEADER");
        this.timeout = setTimeout(function(){that.chooseLeaderTimeout();}, GameManager.timeouts.ELECT_LEADER*1000);
        return;
    }
    
    if (this.gameState == gameStates.CHOOSE_TOPIC){
        console.log("CHOOSE_TOPIC");
        this.timeout = setTimeout(function(){that.chooseTopicTimeout();}, GameManager.timeouts.CHOOSE_TOPIC*1000);
        return;
    }
    
    if (this.gameState == gameStates.SUBMISSION_PERIOD){
        
        this.timeout = setTimeout(function(){that.submissionTimeout();}, GameManager.timeouts.SUBMISSION_PERIOD*1000);
        return;
    }
    
    if (this.gameState == gameStates.CHOOSE_WINNER){
        this.timeout = setTimeout(function(){that.winnerTimeout();}, GameManager.timeouts.CHOOSE_WINNER*1000);
        return;
    }
    
    if (this.gameState == gameStates.INTERMISSION){
        this.timeout = setTimeout(function(){that.intermissionEnded();}, GameManager.timeouts.INTERVAL*1000);
        return;
    }
}

GameManager.prototype.chooseLeaderTimeout = function(){
    console.log("CHOOSE LEADER");
    var randomIndex;
    var leader = this.playerIds[this.leaderIndex];
    /*if(this.leaderCandidates.length == 0){
       randomIndex = getRandomInt(0, this.numPlayers);
       randomPlayer = this.playerIds[randomIndex];
    }else{
       randomIndex = getRandomInt(0, this.leaderCandidates.length);
       randomPlayer = this.leaderCandidates[randomIndex];
    }*/
    
    var notification = new Message.Message();
    
    notification.setEventName("leaderChosen");
    notification.setMessageType("GameMessage");
    notification.setLeader(leader);
    this.leaderId = leader;
    this.gameState = GameManager.gameStates.CHOOSE_TOPIC;
    notification = JSON.stringify(notification);
    
    for(player in this.playerInfo){
        console.log(player);
        this.playerInfo[player].getSocket().send(notification);
    }
    
    this.run(); 
}

GameManager.prototype.chooseTopicTimeout = function(){
    this.gameState = GameManager.gameStates.SUBMISSION_PERIOD;
    console.log("CHOOSE TOPIC OVER");
    var notification = new Message.Message();
    notification.setMessageType("GameMessage");
    notification.setEventName("topic");
    notification.setTopic(this.currentTopic);
    notification = JSON.stringify(notification);
    for(player in this.playerInfo){
        this.playerInfo[player].getSocket().send(notification);
    }
    
    this.run();
}

GameManager.prototype.submissionTimeout = function(){
    console.log("SUBMISSION TIMEOUT");
    this.gameState = GameManager.gameStates.CHOOSE_WINNER;
    //tell leader to choose a winner
    var notification = new Message.Message();
    notification.setMessageType("GameMessage");
    notification.setEventName("chooseWinner");
    notification = JSON.stringify(notification);
    console.log(this.leaderId);
    this.playerInfo[this.leaderId].getSocket().send(notification);
    this.run();
}

GameManager.prototype.winnerTimeout = function(){
    console.log("CHOOSE WINNER TIMEOUT");
    this.gameState = GameManager.gameStates.INTERMISSION;
    var notification = new Message.Message();
    notification.setMessageType("GameMessage");
    notification.setEventName("noWinnerChosen");
    notification = JSON.stringify(notification);
    
    for(player in this.playerInfo){
        this.playerInfo[player].getSocket().send(notification);
    }

    this.leaderIndex = (this.leaderIndex+1)%(this.playerIds.length);
    this.run();
}

GameManager.prototype.sendScores = function(){
    var scoresMessage = new Message.Message;
    scoresMessage.setMessageType("GameMessage");
    scoresMessage.setEventName("scores");
    scoresMessage.setScores(this.scores);
    scoresMessage = JSON.stringify(scoresMessage);
    
    for(var player in this.playerInfo){
        var soc = this.playerInfo[player].getSocket();
        soc.send(scoresMessage);
    } 
}

GameManager.prototype.intermissionEnded = function(){
    console.log("INTERMISSION");
    this.gameState = GameManager.gameStates.ELECT_LEADER;
    this.sendScores();
    this.run();
}

function attachGameManagerEvents(gameManager){
  
  //CHOOSE TOPIC PERIOD
  gameManager.on('topicChosen',
                 function(data, socket){
                  
      if (socket.id != this.leaderId) {
          return;
      }
      
      if (this.gameState != GameManager.gameStates.CHOOSE_TOPIC) {
          return;
      }

      this.currentTopic = data.getTopic();
  });
  
  //SUBMISSION PERIOD
  gameManager.on("submission",
                 function(data, socket){
                  
        //maybe do some logging here
        if (this.gameState != GameManager.gameStates.SUBMISSION_PERIOD) {
            return;
        }
        
        var submission = new Message.Message;
        submission.setMessageType("GameMessage");
        submission.setEventName("submission");
        submission.setSubmission(data.getSubmission());
        submission = JSON.stringify(submission);
        for(var player in this.playerInfo){
            var soc = this.playerInfo[player].getSocket();
            soc.send(submission);
        }
    });
    
    //CHOOSE WINNER
    gameManager.on("winnerChosen",
                    function(data, socket){
        
        if (socket.id != this.leaderId){
            return;        
        }
        
        if (this.gameState != GameManager.gameStates.CHOOSE_WINNER) {
            return;
        }
        
        this.gameState = GameManager.gameStates.INTERMISSION;
        this.timeout.clearTimeout();
        var submission = new Message.Message;
        submission.setEventType("GameMessage");
        submission.setEventName("winnerChosen");
        submission.setWinner(data.winner);
        this.scores[data.winner] += 1;
        submission = JSON.stringify(submission);
        for(var player in room.playerInfo){
            var soc = this.playerInfo[player].getSocket();
            soc.send(submission);
        } 
        
        this.leaderIndex = (this.leaderIndex+1)%(this.playerIds.length);
        this.run();         
    });
}

GameManager.prototype.handleMsg = function(msg, socket) {
    this.fire(msg, socket);
}

           /***************/
           /*ServerManager*/
           /***************/

//DESCRIPTION: Holds all the game state and also the game server that
//runs the game

//CREATOR
function ServerManager(port){
//DATA MEMBERS:
    //TODO: Route all Messages to RoomManagers, other events are taken care of 
    //by server
    
    //Array to store connections
    this.sockets = [];
    
    //A map of roomId -> roomManager objects holding information about all the 
    //game rooms that the server is managing
    this.roomInfo = {};
    
    this.rooms = [];
    
    this.events = {};
    
    //Webserver that handles requests 
    this.websocket = listen(port);
    
//MANIPULATORS:
    this.on = function(eventName, callback){
                  this.events[eventName] = callback;
              };
              
    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        console.log("CALLING FIRE ON " + msg.eventName);
        var event = serverManager.events[msg.eventName];
        event.call(this, msg, socket); //call on this roomManager object
    }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//function to create a WebSocketServer
function listen(server) {
  var manager;
  
  if (typeof server === 'number') { 
    manager = new WebSocketServer({
        port: server
      });
  } else {
    manager = new WebSocketServer({
      server: server
    });
  }
  
  return manager;
}

ServerManager.prototype.handleMsg = function(msg, socket) {
    if (msg.messageType != "ServerMessage") {
        console.log(msg.eventName);
        console.log(msg.getRoomId());
        if (!(msg.getRoomId() in this.roomInfo)) {
            var errorMsg = new Message.Message;
            errorMsg.setMessageType("ServerMessage");
            errorMsg.setEventName("Room " + msg.getRoomId() + " does not exist");
            socket.send(JSON.stringify(errorMsg));
        }
        this.roomInfo[msg.getRoomId()].handleMsg(msg, socket);
        return;
    }
    
    this.fire(msg, socket);
}

function attachServerManagerEvents(serverManager) {
  var websocket = serverManager.websocket;
  
  websocket.on('connection', function(socket) { //a connection opened so register callbacks for the socket
    console.log('connect');
    iolog('connect');

    socket.id = id();
    console.log('new socket got id: ' + socket.id);
    iolog('new socket got id: ' + socket.id);
    
    //send id to person
    
    var idMsg = new Message.Message;
    idMsg.setMessageType("ServerMessage");
    idMsg.setEventName("givenId");
    idMsg.setYourId(socket.id);
    socket.send(JSON.stringify(idMsg));
    
    var roomMsg = new Message.Message;
    roomMsg.setMessageType("ServerMessage");
    roomMsg.setEventName("roomList");
    roomMsg.setRoomList(serverManager.rooms);
    var roomMsg = JSON.stringify(roomMsg);    
    socket.send(roomMsg);
    
    serverManager.sockets.push(socket);
    
    socket.on('message', function(msg) {
      var data = JSON.parse(msg);
      console.log(data);
      var decodedMsg = new Message.Message(data);
      console.log(decodedMsg.eventName);
      serverManager.handleMsg(decodedMsg, socket);
    });

    socket.on('close', function() {
      console.log('closed socket');
      iolog('closed socket');

      // find socket to remove
      var i = serverManager.sockets.indexOf(socket);
      // remove socket
      serverManager.sockets.splice(i, 1);

      // remove from rooms and send remove_peer_connected to all sockets in room
      var room;
      for (var i=0; i<serverManager.roomInfo.length; i++) { //TODO: this doesn't need a loop
          room = serverManager.roomInfo[i];
          room.deletePlayer(socket.id);
          break;
        }
      });
    });
      
      
      // call the 'room_leave' callback
      //gameManager.fire('room_leave', room, socket.id);
      
      // call the disconnect callback
      //gameManager.fire('disconnect', rtc); //TODO: need to register these callbacks which are called when the socket closes
    //});
    
    // call the connect callback
    //gameManager.fire('connect', rtc);

  serverManager.on('createRoom', function(data, socket){
    console.log("create_room");
    iolog('create_room');
    var roomId = data.getRoomId();
    //check if room already exists
    if (roomId in this.roomInfo) {
        var errorMsg = new Message.Message;
        errorMsg.setMessageType("ServerMessage");
        errorMsg.setEventName("Room already exists with name " + roomId);
        socket.send(JSON.stringify(errorMsg));
        return;
    }
    
    var newRoom = new RoomManager(roomId);
    attachRoomManagerEvents(newRoom);
    
    //add creator to room
    newRoom.addPlayer(socket.id, socket);
    this.roomInfo[roomId] = newRoom;
    this.rooms.push(roomId);
    
    var response = new Message.Message();
    response.setMessageType("ServerMessage");
    response.setEventName("roomCreated");
    response.setRoomId(roomId);
    
    socket.send(JSON.stringify(response));

    /* send join confirmation */
    var joinConfirm = new Message.Message;
    joinConfirm.setMessageType("RoomMessage");
    joinConfirm.setEventName("joinedRoom");
    joinConfirm.setRoomId(roomId);
    socket.send(JSON.stringify(joinConfirm));
    
    //tell everyone about the new room
    var response = new Message.Message();
    var rooms = [];

    response.setMessageType("ServerMessage");
    response.setEventName("roomList");
    response.setRoomList(this.rooms);
    var finalresponse = JSON.stringify(response);
    
    for (var player in this.sockets) {
        this.sockets[player].send(finalresponse);
    }
  });
}

serverManager.getSocket = function(id) {
  var connections = gameManager.sockets;
  if (!connections) {
    // TODO: Or error, or customize
    return;
  }

  for (var i = 0; i < connections.length; i++) {
    var socket = connections[i];
    if (id === socket.id) {
      return socket;
    }
  }
}

// generate a 4 digit hex code randomly
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
function id() {
  console.log("making id");
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}










