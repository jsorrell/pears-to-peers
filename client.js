             /********/
             /*Client*/
             /********/
             
//Description: Represents a player 

function Client(pageCallback) {
    this.scores = {};
    this.rooms = [];
    this.submissions = {};
    this.myID = ""; 
    this.currentRoomId = null;
    this.serverConn;
    this.pageCallback = pageCallback;
    this.topic = "";
    this.isLeader = false;
    this.leaderId = "";
    this.fileUploadProgress = 0;

    this.onopen = function(evt) {
        console.log("WebSocket open");
        this.pageCallback("connectedToServer");
    }

    this.onerror = function(rawMsg) {
        console.log("communication error");
    }
    this.onclose = function(evt) {
        console.log("connection closed");
        this.pageCallback("serverConnectionClosed");
    }

};

Client.prototype.connect = function(addr){
    this.serverConn = new WebSocket(addr);
    this.serverConn.onopen = $.proxy(this.onopen,this);
    this.serverConn.onmessage = $.proxy(this.onmessage,this);
    this.serverConn.onerror = $.proxy(this.onerror,this);
    this.serverConn.onclose = $.proxy(this.onclose,this);
    this.serverConn.pageCallback = this.pageCallback;
}

//MANIPULATORS
Client.prototype.onmessage = function(rawMsg){
    var msg = new Message(JSON.parse(rawMsg.data));
    var eventName = msg.getEventName();
    console.log("GOT EVENT: " + eventName);
    console.log(msg);
    switch(eventName) {
        case "noWinnerChosen":
            this.pageCallback(eventName);
            break;
            
        case "chooseWinner":
            this.submissions = msg.getAllSubmissions();
            console.log("submissions: ");
            console.log(this.submissions);
            this.pageCallback(eventName);
            break;
            
        case "givenId":
            this.myID = msg.getYourId();
            this.pageCallback(eventName);
            console.log("My ID is " + this.myID);
            break;
            
        case "peerList":
            var peerList = msg.getPeerList();
            for (idx in peerList) {
                if (!this.scores.hasOwnProperty(peerList[idx]))
                    this.scores[peerList[idx]] = 0;
            }
            this.pageCallback(eventName);
            break;
        
        case "roomList":
            this.setRooms(msg.getRoomList());
            console.log("rooms set to: ");
            console.log(this.getRooms());
            this.pageCallback(eventName);
            break;
        
        case "roomCreated":
            this.pageCallback(eventName);
            break;
        
        case "joinedRoom":
            this.currentRoomId = msg.getRoomId();
            this.pageCallback(eventName);
            break;
        
        case "scores":
            console.log(msg.getScores());
            this.scores = msg.getScores();
            this.pageCallback(eventName);
            break;
            
        case "startGame":
            console.log("GAME STARTED");
            this.pageCallback(eventName);
            break;

        case "submission":
            console.log("GOT SUBMISSION: " + msg.getSubmission());
            this.submissions = msg.getSubmission();
            this.pageCallback(eventName);
            break;
         
        case "leaderChosen":
            this.isLeader = (msg.getLeader() === this.myID);
            this.leaderId = msg.getLeader();
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

/* entry:
{
    type: "text" or "file",
    data: "text" or file data
}

*/

Client.prototype.sendEntry = function(entry) {
    if (entry.type === 'text') {
        var request = new Message();
        request.setMessageType("GameMessage");
        request.setEventName("submission");
        request.setSubmission(entry.data);
        request.setRoomId(this.getCurrentRoomId());
        this.serverConn.send(JSON.stringify(request));
    }
    else if (entry.type === 'file') {
        var fileData = new FormData();
        console.log(entry);
        fileData.append('submissionFile', entry.data);
        fileData.append('id', this.myID);
        fileData.append('roomId', this.currentRoomId);

        $.ajax({
            async: true,
            url: 'http://localhost:8081/file-upload',
            type: 'POST',
            data: fileData,
            cache: false,
            contentType: false,
            dataType: "json",
            processData: false, // Don't process the files
            success: $.proxy(function(data, textStatus, jqXHR)
            {
                if(typeof data.error === 'undefined')
                {
                    //success
                    console.log(data);
                    if (data.receivedFile){
                        this.pageCallback("fileUploadSuccess");
                    }
                }
                else
                {
                    // Handle errors here
                    console.log('Upload Errors: ' + data.error);
                }
            },this),
            error: $.proxy(function(jqXHR, textStatus, errorThrown)
            {
                // Handle errors here
                console.log('ERRORS in Upload: ' + textStatus);
                this.pageCallback("fileUploadError");
            },this),
            xhr: $.proxy(function()
            {
                var xhr = new window.XMLHttpRequest();
                //Upload progress
                console.log("creating xhr");
                xhr.upload.onprogress = $.proxy(function(evt){
                    this.fileUploadProgress = evt.loaded / file.size * 100;
                    this.pageCallback("fileUploadProgress");
                },this); 
                return xhr;
            },this)
        });
    }
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
