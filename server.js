/***server.js****/
//TODO: change deletePlayer and add exit room function, delete empty rooms
//TODO: standardize format of messages
//TODO: clicking submit before game breaks it
//TODO: Delete rooms that are empty
//TODO: video streaming/image streaming
//TODO: different pages
//TODO: profile for each user storing videos/images

//TODO: remove player from a room hes in if he sends a join-room message for another room

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
    this.gameManager      = {};
    this.scores           = {};

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
            iolog("tried to add player "+playerId.toString()+" to started room "+this.roomId.toString());
        }

        iolog("Player " + playerId + " joined room " + roomId);

        this.playerInfo[playerId] = new Player(playerId, socket);
        this.playerIds.push(playerId);
        this.numPlayers++;
        this.scores[playerId] = 0;

        //send the player a confirmation that he joined the room
        var joinConfirm = new Message.Message("RoomMessage","joinedRoom");
        joinConfirm.data.peerList = this.playerIds;
        joinConfirm.data.scores = this.scores;
        joinConfirm.data.roomId = roomId;
        socket.send(JSON.stringify(joinConfirm));

        //broadcast list of players to everyone else
        var message = new Message.Message("RoomMessage","peerList",
            {peerList:this.playerIds, add:[playerId]});
        this.broadcast(message,[playerId]);
    }

    this.deletePlayer = function(playerId){
        //can only delete existent players
        if (!(playerId in this.playerInfo)) {
            iolog("tried to delete nonexistent player " + playerId.toString());
            return false;
        }
        console.log("deleting player "+ playerId.toString());
        
        if(this.playerInfo[playerId].started) {
            this.numStarted--;
        }
        
        delete this.playerInfo[playerId];
        delete this.scores[playerId];
        //find and remove from playerIds
        this.playerIds.splice(this.playerIds.indexOf(playerId), 1);
        this.numPlayers--;
        
        if(this.gameStarted) {
           this.gameManager.deletePlayer(playerId);
        }
        
        var playerIds = this.playerIds;
        var response = new Message.Message;

        //send everyone in the room the updated playerlist
        var response = new Message.Message("RoomMessage","peerList",
            {peerList:this.playerIds, remove:[playerId]});
        this.broadcast(response);
        return true;
   }


   this.stopGame = function(){
       console.log("STOPPING GAME\n");
       console.log(this.gameStarted);
       if (!this.gameStarted) {
           return;
       }
       
       this.gameStarted = false;
       this.numStarted = 0;
       
       for(playerId in this.playerInfo) {
           this.playerInfo[playerId].started = false;
       }
       
       var stopGameMsg = new Message.Message();
       stopGameMsg.messageType = "RoomMessage";
       stopGameMsg.eventType = "stopGame";
       stopGameMsg.data.details = "Insufficient players to continue";
       this.broadcast(stopGameMsg);
   }
   
   this.addCandidate = function(playerId){
       this.leaderCandidates.push(playerId);
   }

//ACCESSORS:
   this.getPlayer = function(playerId){
       return this.playerInfo[playerId];
   }

   this.getSocket = function(playerId){
       return this.playerInfo[playerId].getSocket();
   }
};

function attachRoomManagerEvents(roomManager) {
    roomManager.on('joinRoom', function(data, socket) {
        var roomId = data.get("roomId");
        var username = data.get("username");
        //make sure game has not already started
        if(this.gameStarted){
            var response = new Message.Message("RoomMessage","Error");
            response.data.details = "Game already started!";
            socket.send(JSON.stringify(response));
            return;
        }

        //make sure the player is not already in the room
        if(username in this.playerInfo){
            var response = new Message.Message("RoomMessage","Error");
            response.data.details = "Player already in room!";
            socket.send(JSON.stringify(response));
            return;
        }

        //add the player to the room
        this.addPlayer(username, socket);
    })

    roomManager.on('startGame', function(data, socket){
        iolog('New game started in room ' + this.roomId);

        var playerId = data.get("username");

        if(!this.playerInfo[playerId].started) {
            this.playerInfo[playerId].started = true; //TODO: put this in StartPlayer() call returning true when game started
            this.numStarted++;
            var numPlayers = this.numPlayers;

            //if enough players have started, the game starts
            if(this.numStarted == numPlayers && numPlayers >= consts.minPlayers){
                this.gameStarted = true;
                this.startNewGame();

            } else {
                //send a message to players saying who the room is waiting for
                var numWaitingMessage = new Message.Message("RoomMessage","needMoreStartedPlayers");
                var waitingOn = [];
                //see who has not started yet
                for (var player in this.playerInfo) {
                    if (!this.playerInfo[player].started) {
                        waitingOn.push(player);
                    }
                }
                numWaitingMessage.data = {numStarted: this.numStarted, numNeeded: consts.minPlayers, waitingOn: waitingOn};
                this.broadcast(numWaitingMessage);
            }
        } else {
            //player has already started. Ignore
            var response = new Message.Message("RoomMessage","Error",{details:"You have already started"});
            socket.send(JSON.stringify(response));
            return;
        }//TODO: let server handle mapping user->room later
    })
}

RoomManager.prototype.startNewGame = function()
{
    iolog("Starting new game in room " + this.roomId);
    var leader = this.chooseLeader();
    iolog("leader is " + leader);
    var that = this;
    this.gameManager = new GameManager(this.playerInfo,
                                       this.playerIds,
                                       leader,
                                       function(winner){
                                            if (winner){
                                                that.scores[winner]++;
                                            }
                                            var scoreMessage = 
                                                new Message.Message("RoomMessage","scores", {scores: that.scores});
                                            that.broadcast(scoreMessage);
                                       },
                                       function(){that.stopGame()});

    //var response = new Message.Message("RoomMessage","startGame",{leader:leader});
    attachGameManagerEvents(this.gameManager);
    this.gameManager.run();
}

RoomManager.prototype.handleMsg = function(msg, socket) {
    if (msg.messageType == "GameMessage") {
        if (!this.gameStarted) {
            return;
        }
        this.gameManager.handleMsg(msg, socket);
    } else {
        this.fire(msg, socket);
    }
}

RoomManager.prototype.broadcast = function(message,except)
{
    console.log("BROADCASTING " + message.eventType);
    stringifiedMsg = JSON.stringify(message)
    for(var id in this.playerIds){
        if (except && except.indexOf(id) > -1) continue;
        // send a list of all peers to all clients
        var clientConn = this.getSocket(this.playerIds[id]);
        clientConn.send(stringifiedMsg);
    }
}

RoomManager.prototype.chooseLeader = function(){
    this.leaderIndex = (this.leaderIndex+1)%(this.numPlayers);
    var leader = this.playerIds[this.leaderIndex];
    this.leaderId = leader;
    return leader;
}


           /*************/
           /*GameManager*/
           /*************/

function GameManager(playerInfo, 
                     playerIds, 
                     leader, 
                     roundEndCallBack, 
                     gameStopCallBack){
//DATA MEMBERS:

//A map from gameState to objects that hold callbacks for various events.
    this.events           = {};
    this.playerInfo       = playerInfo; //Map of player objects by ID
    this.playerIds        = playerIds;
    this.endRoundCallBack = roundEndCallBack;
    this.stopGameCallBack = gameStopCallBack;
    this.leaderId         = leader;
    this.leaderIndex      = playerIds.indexOf(leader);
    this.numPlayers       = playerIds.length;
    this.timeout          = null;
    this.topic            = "";
    this.allSubmissions   = {};
    this.submissionsMap   = [];
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
    ELECT_LEADER: 0,
    CHOOSE_TOPIC: 1,
    SUBMISSION_PERIOD: 2,
    CHOOSE_WINNER: 3,
};

GameManager.stateToString = function(state)
{
    switch(state){
        case GameManager.gameStates.CHOOSE_TOPIC:
            return "chooseTopic";
        case GameManager.gameStates.SUBMISSION_PERIOD:
            return "submissionPeriod";
        case GameManager.gameStates.CHOOSE_WINNER:
            return "chooseWinner";
    }
}

GameManager.timeouts = {
    ELECT_LEADER : 1,
    CHOOSE_TOPIC : 20,
    SUBMISSION_PERIOD : 12,
    CHOOSE_WINNER : 20,
};

GameManager.prototype.endRound = function(winner)
{
    clearTimeout(this.timeout);
    this.allSubmissions = {};
    this.submissionsMap = {};
    this.gameState = GameManager.gameStates.ELECT_LEADER;
    this.endRoundCallBack(winner);
    this.run();
}

GameManager.prototype.stop = function(){
     clearTimeout(this.timeout);
     this.gameState = GameManager.gameStates.ELECT_LEADER;
}
 
GameManager.prototype.broadcast = function(message,except)
{
    for(var player in this.playerInfo){
        // send a list of all peers to all clients
        if (except && except.indexOf(id) > -1) continue;
        this.playerInfo[player].getSocket().send(JSON.stringify(message));
    }
}

//move some to roommanager
GameManager.prototype.deletePlayer = function(playerId) {
    delete this.playerIds[playerId];
    delete this.playerInfo[playerId];
    delete this.allSubmissions[playerId];
    
    this.numPlayers--;
    
    if (this.numPlayers < consts.minPlayers) {
        this.stopGameCallBack();
        this.stop();
    }
    
    if (this.leaderId === playerId) {
        //stop this round and restart
        this.endRound(false);
        return;
    }
    
    //if choosing winner, notify to not choose disconnected person
    if (this.gameState === GameManager.gameStates.CHOOSE_WINNER){
        var notification = new Message.Message("GameMessage","chooseWinner");
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
        this.broadcast(notification);
    }
}

GameManager.prototype.run = function(gameState) {
    var gameStates = GameManager.gameStates;
    var that = this;
    if (gameState)
        this.gameState = gameState;

    var message = new Message.Message("GameMessage","state",{state:GameManager.stateToString(this.gameState)});
    this.broadcast(message);

    if (this.gameState == gameStates.ELECT_LEADER){
        this.timeout = setTimeout(function(){that.chooseLeaderTimeout();}, GameManager.timeouts.ELECT_LEADER*1000);
        return;
    }
    
    if (this.gameState == gameStates.CHOOSE_TOPIC){
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
}

GameManager.prototype.chooseLeaderTimeout = function(){
    this.leaderIndex = (this.leaderIndex+1)%(this.numPlayers);
    var leader = this.playerIds[this.leaderIndex];
    this.leaderId = leader;
    var notification = new Message.Message();
    notification.eventType = "leaderChosen";
    notification.messageType = "GameMessage";
    notification.data.leader = leader;
    this.gameState = GameManager.gameStates.CHOOSE_TOPIC;
    this.broadcast(notification);
    this.run();
}

GameManager.prototype.chooseTopicTimeout = function(){
    iolog("Topic Choose Timeout");
    this.gameState = GameManager.gameStates.SUBMISSION_PERIOD;
    this.setTopic("[No Topic Chosen]");
    this.run();
}

GameManager.prototype.setTopic = function(topic){
    this.topic = topic;
    var notification = new Message.Message("GameMessage","topic",{topic: topic});
    this.broadcast(notification);
}

GameManager.prototype.submissionTimeout = function(){
    iolog("Submission Timeout");
    //tell leader to choose a winner
    this.gameState = GameManager.gameStates.CHOOSE_WINNER;
    var notification = new Message.Message("GameMessage","chooseWinner");
    var submissions = {};
    this.submissionsMap = {};

    //build submissionsMap and submissions
    var i = 0;
    
    for (var player in this.allSubmissions) {
        submissions[i] = this.allSubmissions[player];
        this.submissionsMap[i] = player;
        i++;
    }

    notification.data.allSubmissions = submissions;

    this.broadcast(notification);

    //tell other people submission period is over
    this.run();
}

GameManager.prototype.winnerTimeout = function(){
    iolog("Winner Timeout");
    //no winner was chosen in time
    this.gameState = GameManager.gameStates.ELECT_LEADER;
    var notification = new Message.Message("GameMessage","noWinnerChosen");

    this.broadcast(notification);

    this.endRound();
}

function attachGameManagerEvents(gameManager){

  //CHOOSE TOPIC PERIOD
  gameManager.on('topicChosen',
                 function(data, socket){

      var username = data.get("username");
      if (username != this.leaderId) {
          iolog("non-leader tried to choose topic");
          return;
      }

      if (this.gameState != GameManager.gameStates.CHOOSE_TOPIC) {
          iolog("not time to choose topic");
          return;
      }

      clearTimeout(this.timeout);
      this.setTopic(data.get("topic"));
      this.gameState = GameManager.gameStates.SUBMISSION_PERIOD;
      this.run();
  });

    //SUBMISSION PERIOD
    gameManager.on("submission",
                 function(data, socket)
    {
        var username = data.get("username");     
        //received text submission
        //maybe do some logging here
        if (this.gameState != GameManager.gameStates.SUBMISSION_PERIOD) {
            iolog(username + " tried to submit outside of submission period");
            return;
        }
        
        this.allSubmissions[username] =
                                   {type: "text", data: data.get("submission")};
    });

    //CHOOSE WINNER
    gameManager.on("winnerChosen",
                    function(data, socket)
    {
        var username = data.get("username"); 
        
        if (this.gameState != GameManager.gameStates.CHOOSE_WINNER) {
            iolog( + " tried to select winner at wrong time");
            return;
        }
        if (username != this.leaderId){
            iolog("non-leader tried to choose winner");
            return;
        }

        var winner = this.submissionsMap[data.get("winner")];
        if (!(winner in this.allSubmissions)) {
            var notification = new Message.Message("GameMessage","error",
                {details: "selected winner not valid"});
            this.playerInfo[this.leaderId].getSocket().send(JSON.stringify(notification));
            return;
        }

        clearTimeout(this.timeout);
        var winnerChosenMessage = new Message.Message("GameMessage","winnerChosen");
        winnerChosenMessage.data.winner = winner;
        this.broadcast(winnerChosenMessage);

        this.endRound(winner);
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

    //Map from sockets to usernames
    this.socketToUsername = {};
    
    //Map from playerId to player objects
    this.players = {};
    
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
    if (!(socket.id in this.socketToUsername) 
        && !(this.socketToUsername[socket.id] in this.players)){
        return;
    }
    
    if (msg.messageType != "ServerMessage") {
        var roomId = msg.get("roomId");
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

        //add username for this socket
        msg.data.username = this.socketToUsername[socket.id];
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

ServerManager.prototype.deletePlayer = function(playerId){
    //delete the player from both maps
    delete serverManager.players[playerId];
    delete serverManager.socketToUsername[playerId];
    
    // remove from rooms and send remove_peer_connected to all sockets in room
    for (var i in this.roomInfo) { //TODO: this doesn't need a loop
        room = this.roomInfo[i];
        room.deletePlayer(playerId);
        if(room.numPlayers == 0) {
            delete this.roomInfo[i];
            for (var j=0; j<this.rooms.length; j++) {
                if (this.rooms[j] == i) {
                    this.rooms.splice(i, 1);
                }
            }
            
            var response = new Message.Message();
            response.messageType = "ServerMessage";
            response.eventType = "roomList";
            response.data.roomList = this.rooms;
            this.broadcast(response);
        }
        break;
    }
}

ServerManager.prototype.broadcast = function(message,except)
{
    var stringifiedMsg = JSON.stringify(message)
    for (var player in this.players) {
        if (except && except.indexOf(id) > -1) continue;
        this.players[player].socket.send(stringifiedMsg);
    }
}

ServerManager.prototype.checkValidUsername = function(username) {
    if (username in this.players) {
        return "Username already exists!";
    }
    
    return "";
}

ServerManager.prototype.getSocket = function(id) {
    if (!id in this.players) {
        return null;    
    }

    return this.players[id].socket;
}

function attachServerManagerEvents(serverManager) {
    var websocket = serverManager.websocket;

    websocket.on('connection', function(socket) { //a connection opened so register callbacks for the socket
        //give socket an id
        socket.id = id();
        while (socket.id in serverManager.socketToUsername) {
            socket.id = id();
        }
        
        //add socket to list of sockets
        serverManager.socketToUsername[socket.id] = "";

        //set up event handler for messages from client
        socket.on('message', function(msg) {
            var data = JSON.parse(msg);
            var decodedMsg = Message.Message.copyMessage(data);
            serverManager.handleMsg(decodedMsg, socket);
        });

        socket.on('close', function() {
            var username = serverManager.socketToUsername[socket.id];
            iolog('client with socket id ' + socket.id + " disconnected");
            
            //cleanup after this player
            serverManager.deletePlayer(username);
        });
    });

    serverManager.on('username', function(data, socket) {
        var username = data.get("username");
        var error = this.checkValidUsername(username);
        if (error != "") {
            var errorMsg = new Message.Message;
            errorMsg.messageType = "ServerMessage";
            errorMsg.eventType = "Error";
            errorMsg.data.details = error;
            socket.send(JSON.stringify(errorMsg));
            return;
        }
        
        //make new Player
        var newPlayer = new Player(username, socket);
        
        iolog('new client with id ' + username + " connected");

        //add player to playerlist
        this.players[username] = newPlayer;
        
        //add username to socketToPlayer map
        this.socketToUsername[socket.id] = username;
        
        //send approval of username msg
        successMsg = new Message.Message;
        successMsg.messageType = "ServerMessage";
        successMsg.eventType = "usernameSuccess";
        successMsg.data.username = username;
        socket.send(JSON.stringify(successMsg));
        
        //send list of rooms to players
        var roomMsg = new Message.Message;
        roomMsg.messageType = "ServerMessage";
        roomMsg.eventType = "roomList";
        roomMsg.data.roomList = serverManager.rooms;
        socket.send(JSON.stringify(roomMsg));
    });
    
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
        newRoom.addPlayer(serverManager.socketToUsername[socket.id], socket);
        this.roomInfo[roomId] = newRoom;
        this.rooms.push(roomId);

        var response = new Message.Message();
        response.messageType = "ServerMessage";
        response.eventType = "roomCreated";
        response.data.roomId = roomId;

        socket.send(JSON.stringify(response));

        //tell everyone about the new room
        var response = new Message.Message();
        var rooms = [];

        response.messageType = "ServerMessage";
        response.eventType = "roomList";
        response.data.roomList = this.rooms;

        this.broadcast(response);
    });
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
var SSCONSTANTS =
{
    PORT: 8081,
    TMP_PATH: __dirname + "/tmp/",
    REL_UPLOAD_PATH: "uploads/",
    UPLOAD_ADDR: "/file-upload"
}
SSCONSTANTS.ABS_UPLOAD_PATH = __dirname+"/"+SSCONSTANTS.REL_UPLOAD_PATH;


var fs = require ('fs');
var express = require('express');
var app = express();
var multiparty = require("connect-multiparty");

iolog("STARTING STREAMING SERVER ON PORT " + SSCONSTANTS.PORT.toString());
app.listen(SSCONSTANTS.PORT);

app.use(multiparty({uploadDir:SSCONSTANTS.ABS_UPLOAD_PATH}));

if (!fs.existsSync(SSCONSTANTS.TMP_PATH)) {
    iolog("Tmp dir doesn't exist. Creating.");
    fs.mkdirSync(SSCONSTANTS.TMP_PATH,0744);
}
if (!fs.existsSync(SSCONSTANTS.ABS_UPLOAD_PATH)) {
    iolog("Uploads dir doesn't exist. Creating.");
    fs.mkdirSync(SSCONSTANTS.ABS_UPLOAD_PATH,0744);
}

app.post(SSCONSTANTS.UPLOAD_ADDR,uploadHandler);

function uploadHandler(req,res)
{
    if (req.files.submissionFile){
        res.json({receivedFile: true});

        var tmp_file_path = req.files.submissionFile.path;
        // set where the file should actually exist
        var target_file_path = SSCONSTANTS.REL_UPLOAD_PATH+req.files.submissionFile.name;
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
