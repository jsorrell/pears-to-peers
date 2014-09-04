/***server.js****/
//TODO: change deletePlayer and add exit room function, delete empty rooms
//TODO: standardize format of messages
//TODO: clicking submit before game breaks it
//TODO: Delete rooms that are empty
//TODO: video streaming/image streaming
//TODO: different pages
//TODO: profile for each user storing videos/images

var consts = {
    minPlayers: 2
};

//external packages
var WebSocketServer = require('ws').Server;
var Message = require('./message'); //find in current directory

var iolog = function(msg){};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === "-debug") {
    iolog = function(msg) {
      console.log(msg);
    };
  }
}

/****START THE SERVER****/
iolog("STARTING SERVER ON PORT 8080");
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
    this.gameManager      = {};

//MANIPULATORS:
    this.on = function(eventType, callback){
      this.events[eventType] = callback;
    };

    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        iolog("CALLING FIRE ON " + msg.eventType);
        var event = this.events[msg.eventType];
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
        var exist = playerId in this.playerInfo;

        if (!exist) {
            return;
        }

        var player = this.playerInfo[playerId];

        for (var i=0; i<this.playerIds.length; i++) {
            if (this.playerIds[i] === playerId) {
                this.playerIds.splice(i, 1);
                break;
            }
        }

        delete this.playerInfo[playerId];
        this.numPlayers -= 1;

        if(this.gameStarted) {
           this.gameManager.deletePlayer(playerId);
        }

        else if(player.started) {
            this.numStarted -= 1;
        }

        var playerIds = this.playerIds;
        var response = new Message.Message;
        //send everyone in the room the updated playerlist
        for(var id in playerIds) {
           // send new peer a list of all peers
           response.messageType = "RoomMessage";
           response.eventType = "peerList";
           response.data.peerList = playerIds;
           var clientConn = this.getSocket(playerIds[id]);
           clientConn.send(JSON.stringify(response));
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
        var roomId = data.get("roomId");
        var response = new Message.Message();

        //make sure game has not already started
        if(this.gameStarted){
            response.eventType = "Error";
            response.messageType = "RoomMessage";
            response.data.details = "Game already started!";
            socket.send(JSON.stringify(response));
            return;
        }

        //make sure the player is not already in the room
        if(socket.id in this.playerInfo){
            response.eventType = "Error";
            response.messageType = "RoomMessage";
            response.data.details = "Player already in room!";
            socket.send(JSON.stringify(response));
            return;
        }

        iolog("Player " + socket.id.toString() + " joined room " + roomId);

        //add the player to the room
        this.addPlayer(socket.id, socket);

        //send the player a confirmation that he joined the room
        var joinConfirm = new Message.Message;
        joinConfirm.messageType = "RoomMessage";
        joinConfirm.eventType = "joinedRoom";
        joinConfirm.data.roomId = roomId;
        socket.send(JSON.stringify(joinConfirm));


        response.messageType = "RoomMessage";
        response.eventType = "peerList";
        response.data.peerList = this.playerIds;

        // send a list of all peers to all clients
        this.broadcast(response);
    })

    roomManager.on('startGame', function(data, socket){
        iolog('New game started in room ' + this.roomId);

        var playerId = socket.id;
        var response = new Message.Message();

        if(!this.playerInfo[playerId].started) {
            this.playerInfo[playerId].started = true; //TODO: put this in StartPlayer() call returning true when game started
            this.numStarted += 1;
            var numPlayers = this.getNumPlayers();
            //if enough players have started, the game starts
            if(this.numStarted == numPlayers && numPlayers >= consts.minPlayers){
                iolog("Game starting in room " + this.roomId);
                this.gameStarted = true;
                this.gameManager = new GameManager(this.playerInfo,
                                                   this.playerIds);

                attachGameManagerEvents(this.gameManager);
                response.messageType = "RoomMessage";
                response.eventType = "startGame";
                finalResponse = JSON.stringify(response);
                for(var player in this.playerInfo){
                    var soc = this.getSocket(player);
                    soc.send(finalResponse);
                }

                this.gameManager.run();
            } else {
                //send a message to players saying who the room is waiting for
                var numWaitingMessage = new Message.Message();
                var waitingOn = [];
                for (var player in this.playerInfo) {
                    if (!this.playerInfo[player].started) {
                        waitingOn.push(player);
                    }
                }
                numWaitingMessage.messageType = "RoomMessage";
                numWaitingMessage.eventType = "needMoreStartedPlayers";
                numWaitingMessage.data = {numStarted: this.numStarted, numNeeded: consts.minPlayers, waitingOn: waitingOn};
                this.broadcast(numWaitingMessage);
            }
        } else {
            return;
        }//TODO: let server handle mapping user->room later
    })
}

RoomManager.prototype.handleMsg = function(msg, socket) {
    if (msg.messageType == "GameMessage") {
        this.gameManager.handleMsg(msg, socket);
    } else {
        this.fire(msg, socket);
    }
}

RoomManager.prototype.broadcast = function(message)
{
    for(var id in this.playerIds){
        // send a list of all peers to all clients
        var clientConn = this.getSocket(this.playerIds[id]);
        clientConn.send(JSON.stringify(message));
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
    this.leaderId         = "";
    this.numPlayers       = playerIds.length;
    this.scores           = {};
    this.timeout          = {};
    this.allSubmissions   = {};
    this.submissionsMap   = [];
    for (player in playerIds) {
        this.scores[playerIds[player]] = 0;
    }
    this.gameState        = GameManager.gameStates.ELECT_LEADER;
    //MANIPULATORS:

    //register callbacks based on gameState and event name
    this.on = function(eventType, callback){
                  this.events[eventType] = callback;
              };

    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        iolog("CALLING FIRE ON " + msg.eventType);
        var event = this.events[msg.eventType];
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
    ELECT_LEADER : 0,
    CHOOSE_TOPIC : 20,
    SUBMISSION_PERIOD : 12,
    CHOOSE_WINNER : 20,
    INTERMISSION : 5,
};

GameManager.prototype.deletePlayer = function(playerId) {
    delete this.playerIds[playerId];
    delete this.playerInfo[playerId];
    delete this.scores[playerId];
    this.numPlayers -= 1;
    if (this.leaderId === playerId) {
        //stop this round and restart
        clearTimeout(this.timeout);
        this.allSubmissions = {};
        this.submissionsMap = {};
        this.gameState = GameManager.timeouts.ELECT_LEADER;
        this.run();
        return;
    }

    delete this.allSubmissions[playerId];

    if (this.gameState == GameManager.gameStates.CHOOSE_WINNER){
        var notification = new Message.Message();
        notification.messageType = "GameMessage";
        notification.eventType = "chooseWinner";
        var submissions = {};
        var submissionsMap = {};

        var i = 0;
        for (var player in this.allSubmissions){
            submissions[i] = allSubmissions[player];
            submissionsMap[i] = player;
            i += 1;
        }

        this.submissionsMap = submissionsMap;
        notification.data.allSubmissions = submissions;
        notification = JSON.stringify(notification);

        for(player in this.playerInfo){
            this.playerInfo[player].getSocket().send(notification);
        }
    }
}


GameManager.prototype.run = function() {
    var gameStates = GameManager.gameStates;
    var that = this;

    if (this.gameState == gameStates.ELECT_LEADER){
        iolog("ELECT_LEADER");
        this.timeout = setTimeout(function(){that.chooseLeaderTimeout();}, GameManager.timeouts.ELECT_LEADER*1000);
        return;
    }

    if (this.gameState == gameStates.CHOOSE_TOPIC){
        iolog("CHOOSE_TOPIC");
        this.timeout = setTimeout(function(){that.chooseTopicTimeout();}, GameManager.timeouts.CHOOSE_TOPIC*1000);
        iolog("Setting timeout for topic");
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
    iolog("CHOOSE LEADER");
    var randomIndex;
    this.leaderIndex = (this.leaderIndex+1)%(this.numPlayers);
    var leader = this.playerIds[this.leaderIndex];
    this.leaderId = leader;
    /*if(this.leaderCandidates.length == 0){
       randomIndex = getRandomInt(0, this.numPlayers);
       randomPlayer = this.playerIds[randomIndex];
    }else{
       randomIndex = getRandomInt(0, this.leaderCandidates.length);
       randomPlayer = this.leaderCandidates[randomIndex];
    }*/

    var notification = new Message.Message();

    notification.eventType = "leaderChosen";
    notification.messageType = "GameMessage";
    notification.data.leader = leader;
    this.gameState = GameManager.gameStates.CHOOSE_TOPIC;
    notification = JSON.stringify(notification);

    for(player in this.playerInfo){
        iolog(player);
        this.playerInfo[player].getSocket().send(notification);
    }

    this.run();
}

GameManager.prototype.chooseTopicTimeout = function(){
    this.gameState = GameManager.gameStates.SUBMISSION_PERIOD;
    iolog("CHOOSE TOPIC OVER");
    this.setTopic("[No Topic]");
    this.run();
}

GameManager.prototype.setTopic = function(topic){
  var notification = new Message.Message();
  notification.messageType = "GameMessage";
  notification.eventType = "topic";
  iolog("Topic is " + topic);
  notification.data.topic = topic;
  notification = JSON.stringify(notification);
  for(player in this.playerInfo){
      this.playerInfo[player].getSocket().send(notification);
  }
}

GameManager.prototype.submissionTimeout = function(){
    iolog("SUBMISSION TIMEOUT");
    this.gameState = GameManager.gameStates.CHOOSE_WINNER;
    //tell leader to choose a winner
    var notification = new Message.Message();
    notification.messageType = "GameMessage";
    notification.eventType = "chooseWinner";
    var submissions = {};
    var submissionsMap = {};

    var i = 0;
    for (var player in this.allSubmissions) {
        submissions[i] = this.allSubmissions[player];
        submissionsMap[i] = player;
        i += 1;
    }

    this.submissionsMap = submissionsMap;
    notification.data.allSubmissions = submissions;
    notification = JSON.stringify(notification);

    for(player in this.playerInfo){
        this.playerInfo[player].getSocket().send(notification);
    }

    //tell other people submission period is over
    this.run();
}

GameManager.prototype.winnerTimeout = function(){
    iolog("CHOOSE WINNER TIMEOUT");
    this.gameState = GameManager.gameStates.INTERMISSION;
    var notification = new Message.Message();
    notification.messageType = "GameMessage";
    notification.eventType = "noWinnerChosen";
    notification = JSON.stringify(notification);

    for(player in this.playerInfo){
        this.playerInfo[player].getSocket().send(notification);
    }

    this.run();
}

GameManager.prototype.sendScores = function(){
    var scoresMessage = new Message.Message;
    scoresMessage.messageType = "GameMessage";
    scoresMessage.eventType = "scores";
    scoresMessage.data.scores = this.scores;
    scoresMessage = JSON.stringify(scoresMessage);

    for(var player in this.playerInfo){
        var soc = this.playerInfo[player].getSocket();
        soc.send(scoresMessage);
    }
}

GameManager.prototype.intermissionEnded = function(){
    iolog("INTERMISSION");
    this.gameState = GameManager.gameStates.ELECT_LEADER;
    this.allSubmissions = {};
    this.submissionsMap = {};
    this.sendScores();
    this.run();
}

function attachGameManagerEvents(gameManager){

  //CHOOSE TOPIC PERIOD
  gameManager.on('topicChosen',
                 function(data, socket){

      if (socket.id != this.leaderId) {
          iolog("non-leader tried to choose topic");
          return;
      }

      if (this.gameState != GameManager.gameStates.CHOOSE_TOPIC) {
          iolog("not time to choose topic");
          return;
      }

      this.setTopic(data.get("topic"));
      clearTimeout(this.timeout);
      this.gameState = GameManager.gameStates.SUBMISSION_PERIOD;
      this.run();
  });

  //SUBMISSION PERIOD
  gameManager.on("submission",
                 function(data, socket){

        //maybe do some logging here
        if (this.gameState != GameManager.gameStates.SUBMISSION_PERIOD) {
            return;
        }

        this.allSubmissions[socket.id] =
                                   {type: "text", data: data.get("submission")};
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

        var winner = this.submissionsMap[data.get("winner")];
        if (!data.winner in this.scores) {
            notification.messageType = "GameMessage";
            notification.eventType = "chooseWinner";
            notification = JSON.stringify(notification);
            this.playerInfo[this.leaderId].getSocket().send(notification);
            clearTimeout(this.timeout);
            this.run();
            return;
        }

        this.gameState = GameManager.gameStates.INTERMISSION;
        clearTimeout(this.timeout);
        var submission = new Message.Message;
        submission.messageType = "GameMessage";
        submission.eventTye = "winnerChosen";
        submission.data.winner = winner;
        this.scores[winner] += 1;
        submission = JSON.stringify(submission);
        for(var player in this.playerInfo){
            var soc = this.playerInfo[player].getSocket();
            soc.send(submission);
        }

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
    this.on = function(eventType, callback){
        this.events[eventType] = callback;
    };

    this.fire = function(msg, socket) { //need an exception for out of room events like create room
        iolog("CALLING FIRE ON " + msg.eventType);
        var event = serverManager.events[msg.eventType];
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
        var roomId = msg.get("roomId")
        iolog(msg.eventType);
        iolog(roomId);

        if (!(roomId in this.roomInfo)) {
            var errorMsg = new Message.Message;
            errorMsg.messageType = "ServerMessage";
            errorMsg.eventType = "Error";
            errorMsg.data.details =
                                  "Room " + roomId + " does not exist";
            socket.send(JSON.stringify(errorMsg));
            return;
        }

        this.roomInfo[roomId].handleMsg(msg, socket);
        return;
    }

    this.fire(msg, socket);
}

ServerManager.prototype.handleFileReceipt = function(dataPath,
                                                     clientId,
                                                     roomId,
                                                     type)
{
    if (!roomId in this.roomInfo) {
        iolog("invalid room " + roomId);
        return;
    }

    var room = this.roomInfo[roomId];

    if (!clientId in room.playerInfo) {
        iolog("invalid player id " + clientId + " in room " + roomId);
        return;
    }

    if (room.gameManager.gameState != GameManager.gameStates.SUBMISSION_PERIOD) {
        iolog("received submission at invalid time");
        return;
    }

    room.gameManager.allSubmissions[clientId] = {type: type, data: dataPath};
    iolog(room.gameManager.allSubmissions);
}

function attachServerManagerEvents(serverManager) {
  var websocket = serverManager.websocket;

  websocket.on('connection', function(socket) { //a connection opened so register callbacks for the socket
    socket.id = id();
    iolog('new client with id ' + socket.id + " connected");

    //send id to person
    var idMsg = new Message.Message;
    idMsg.messageType = "ServerMessage";
    idMsg.eventType = "givenId";
    idMsg.data.yourId = socket.id;
    socket.send(JSON.stringify(idMsg));

    //send list of rooms to players
    var roomMsg = new Message.Message;
    roomMsg.messageType = "ServerMessage";
    roomMsg.eventType = "roomList";
    roomMsg.data.roomList = serverManager.rooms;
    socket.send(JSON.stringify(roomMsg));

    //add socket to list of sockets
    serverManager.sockets.push(socket);

    //set up event handler for messages from client
    socket.on('message', function(msg) {
      var data = JSON.parse(msg);
      var decodedMsg = new Message.Message(data);
      iolog("received " + decodedMsg.eventType + " message from " + socket.id.toString());
      serverManager.handleMsg(decodedMsg, socket);
    });

    socket.on('close', function() {
      iolog('client with socket id ' + socket.id.toString() + " disconnected");

      // find socket to remove
      var i = serverManager.sockets.indexOf(socket);
      // remove socket
      serverManager.sockets.splice(i, 1);
      // remove from rooms and send remove_peer_connected to all sockets in room
      var room;
      for (var i in serverManager.roomInfo) { //TODO: this doesn't need a loop
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
    iolog("create_room");
    var roomId = data.get("roomId");
    //check if room already exists
    if (roomId in this.roomInfo) {
        var errorMsg = new Message.Message;
        errorMsg.messageType = "ServerMessage";
        errorMsg.eventType = "Error";
        errorMsg.data.details = "Room already exists with name " + roomId;
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
    response.messageType = "ServerMessage";
    response.eventType = "roomCreated";
    response.data.roomId = roomId;

    socket.send(JSON.stringify(response));

    /* send join confirmation */
    var joinConfirm = new Message.Message;
    joinConfirm.messageType = "RoomMessage";
    joinConfirm.eventType = "joinedRoom";
    joinConfirm.data.roomId = roomId;
    socket.send(JSON.stringify(joinConfirm));

    //tell everyone about the new room
    var response = new Message.Message();
    var rooms = [];

    response.messageType = "ServerMessage";
    response.eventType = "roomList";
    response.data.roomList = this.rooms;
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
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

/********************/
/* streaming server */
/********************/

var ssConstants =
{
    port: 8081,
    tmp_path: __dirname + "/tmp",
    upload_path: __dirname + "/uploads",
    upload_addr: "/file-upload"
}

var fs = require ('fs');
var express = require('express');
var app = express();
var multiparty = require("connect-multiparty");

iolog("STARTING STREAMING SERVER ON PORT " + ssConstants.port.toString());
app.listen(ssConstants.port);

app.use(multiparty({uploadDir:ssConstants.upload_path}));

if (!fs.existsSync(ssConstants.tmp_path)) {
    iolog("Tmp dir doesn't exist. Creating.");
    fs.mkdirSync(ssConstants.tmp_path,0744);
}
if (!fs.existsSync(ssConstants.upload_path)) {
    iolog("Uploads dir doesn't exist. Creating.");
    fs.mkdirSync(ssConstants.upload_path,0744);
}

app.post(ssConstants.upload_addr,uploadHandler);

function uploadHandler(req,res)
{
    if (req.files.submissionFile){
        res.json({receivedFile: true});

        var tmp_file_path = req.files.submissionFile.path;
        // set where the file should actually exist
        var target_file_path = ssConstants.upload_path+'/'+req.files.submissionFile.name;
        iolog("downloaded " + target_file_path);
        // move the file from the temporary location to the intended location
        fs.rename(tmp_file_path, target_file_path);

        // Notify game that upload received and completed
        iolog(req.body.id);
        iolog(req.body.roomId);
        serverManager.handleFileReceipt(target_file_path,
                                        req.body.id,
                                        req.body.roomId,
                                        req.files.submissionFile.type);
    } else {
        res.json({receivedFile: false});
    }
}

//FIXME: gives access to all files in directory
app.use(express.static(__dirname));
