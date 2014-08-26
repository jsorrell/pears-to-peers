             /********/
             /*Client*/
             /********/
             
//Description: Represents a player 

function Client(pageCallback) {
    this.peers = [];
    this.rooms = [];
    this.submissions = [];
    this.myID = ""; 
    this.currentRoomId = "";
    this.serverConn;
    this.pageCallback = pageCallback;
    this.topic = "";   
};

Client.prototype.connect = function(addr){
    this.serverConn = new WebSocket(addr);
    var that = this;
    this.serverConn.onmessage = function(rawMsg) {
                                    that.onMessageHandler.call(that, rawMsg);
                                }
    this.serverConn.onclose = function(evt) {
        console.log("socket closed");
    }
    //this.serverConn.onopen = this.OnOpenHandler; //wrap syntax: function(){start(Initiator)};  
}

//MANIPULATORS
Client.prototype.onMessageHandler = function(rawMsg){
    var msg = new Message(JSON.parse(rawMsg.data));
    var eventName = msg.getEventName();
    console.log("GOT EVENT: " + eventName);
    console.log(msg);
    switch(eventName) {
        case "noWinnerChosen":
            this.pageCallback(eventName);
            this.submissions = [];
            break;
            
        case "chooseWinner":
            this.pageCallback(eventName);
            this.submissions = [];
            break;
            
        case "givenId":
            this.myID = msg.getYourId();
            this.pageCallback(eventName);
            console.log("My ID is " + this.myID);
            break;
            
        case "peerList":
            this.peers = msg.peerList;
            this.pageCallback(eventName);
            break;
        
        case "roomList":
            this.rooms = msg.getRoomList();
            this.pageCallback(eventName);
            break;
        
        case "roomCreated":
            this.currentRoomId = msg.getRoomId();
            this.pageCallback(eventName);
            break;
        
        case "joinedRoom":
            this.currentRoomId = msg.getRoomId();
            this.pageCallback(eventName);
            break;
        
        case "scores":
            console.log(msg.getScores());
            this.pageCallback(eventName);
            break;
            
        case "startGame":
            console.log("GAME STARTED");
            this.pageCallback(eventName);
            break;

        case "submission":
            console.log("GOT SUBMISSION: " + msg.getSubmission());
            this.submissions.push(msg.getSubmission());
            this.pageCallback(eventName);
            break;
         
        case "leaderChosen":
            if (msg.getLeader() === this.myID) {
                console.log("PLEASE PICK TOPIC");
            }
            
            this.pageCallback(eventName);
            break;
        case "topic":
            this.topic = msg.getTopic();
            console.log("the topic is " + this.topic);
            this.pageCallback(eventName);
            break;
        
    }
}

Client.prototype.setPeers = function(peers){
    this.peers = peers;
}

Client.prototype.setRooms = function(rooms){
    this.rooms = rooms;
}

Client.prototype.createRoom = function(roomId){
    request = new Message();
    request.setMessageType("ServerMessage");
    request.setEventName("createRoom");
    request.setRoomId(roomId);
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.joinRoom = function(roomId){
    request = new Message();
    request.setMessageType("RoomMessage");
    request.setEventName("joinRoom");
    request.setRoomId(roomId);
    this.serverConn.send(JSON.stringify(request));
    console.log("joined room request sent");
}

Client.prototype.startGame = function(){
    var request = new Message();
    request.setMessageType("RoomMessage");
    request.setEventName("startGame");
    console.log("CURRENT ROOM ID: " + this.currentRoomId);      
    request.setRoomId(this.currentRoomId);
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.sendTopic = function(topic) {
    var request = new Message();
    request.setMessageType("GameMessage");
    request.setEventName("topicChosen");
    request.setTopic(topic);
    request.setRoomId(client.getCurrentRoomId());
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.sendEntry = function(entry) {
    var request = new Message();
    request.setMessageType("GameMessage");
    request.setEventName("submission");
    request.setSubmission(entry);
    request.setRoomId(client.getCurrentRoomId());
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.sendWinner = function(winner) {
    var request = new Message();
    request.setMessageType("GameMessage");
    request.setEventName("winnerChosen");
    request.setWinner(winner);
    request.setRoomId(client.getCurrentRoomId());
    this.serverConn.send(JSON.stringify(request));
}
/*Client.prototype.OnOpenHandler= function(evt){
   client.createRoom("Carl's room");
}*/

//ACCESSORS
Client.prototype.getCurrentRoomId = function(roomId){
    return this.currentRoomId;
}

Client.prototype.getPeers = function(peers){
    return this.peers;
}

Client.prototype.getRooms = function(rooms){
    return this.rooms;
}
