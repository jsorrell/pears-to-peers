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
    this.state = "";
    this.roundWinner = "";

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
    var msg = Message.copyMessage(JSON.parse(rawMsg.data));
    var eventType = msg.eventType;
    console.log("GOT EVENT: " + eventType);
    console.log(msg);
    if (!msg.eventType)
        console.log(rawMsg);
    switch(eventType) {
        case "noWinnerChosen":
            this.pageCallback(eventType);
            break;

        case "chooseWinner":
            this.submissions = msg.get("allSubmissions");
            console.log("submissions: ");
            console.log(this.submissions);
            this.pageCallback(eventType);
            break;

        case "givenId":
            this.myID = msg.get("yourId");
            this.pageCallback(eventType);
            console.log("My ID is " + this.myID);
            break;

        case "peerList":
            var add = msg.get("add");
            if (add) {
                for (var peer in add)
                    if ($.inArray(peer,this.scores) == -1) {
                        console.log("added peer " + add[peer]);
                        this.scores[add[peer]] = 0;
                    }
            }
            var remove = msg.get("remove");
            if (remove) {
                for (var peer in remove)
                    if ($.inArray(peer,this.scores) > -1) {
                        console.log("removed peer " + remove[peer]);
                        delete this.scores[remove[peer]];
                    }
            }
            this.pageCallback(eventType);
            break;

        case "state":
            this.state = msg.get("state");
            this.pageCallback(eventType);
            break;

        case "roomList":
            this.setRooms(msg.get("roomList"));
            console.log("rooms set to: ");
            console.log(this.getRooms());
            this.pageCallback(eventType);
            break;

        case "joinedRoom":
            this.scores = msg.get("scores");
            this.currentRoomId = msg.get("roomId");
            this.pageCallback(eventType);
            break;

        case "scores":
            console.log(msg.get("scores"));
            this.scores = msg.get("scores");
            this.pageCallback(eventType);
            break;

        case "startGame":
            console.log("GAME STARTED");
            this.pageCallback(eventType);
            break;

        case "submission":
            console.log("GOT SUBMISSION: " + msg.get("submission"));
            this.submissions = msg.get(submission);
            this.pageCallback(eventType);
            break;

        case "topic":
            this.topic = msg.get("topic");
            console.log("the topic is " + this.topic);
            this.pageCallback(eventType);
            break;

        case "leaderChosen":
             this.isLeader = (msg.get("leader") === this.myID);
             this.leaderId = msg.get("leader");
             this.pageCallback(eventType);
             break;

        case "stopGame":
            this.scores = {};
            this.submissions = {};
            this.topic = "";
            this.isLeader = false;
            this.leaderId = "";
            this.pageCallback(eventType);
            break;

        case "winnerChosen":
            console.log("winnerChosen");
            this.roundWinner = msg.get("winner");
            this.pageCallback(eventType);
            break;

        case "error":
            console.log("Error: " + msg.get("details"));
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
    request = new Message("ServerMessage","createRoom", {roomId: roomId});
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.joinRoom = function(roomId){
    request = new Message();
    request.messageType = "RoomMessage";
    request.eventType = "joinRoom";
    request.data.roomId = roomId;
    this.serverConn.send(JSON.stringify(request));
    console.log("joined room request sent");
}

Client.prototype.startGame = function(){
    var request = new Message();
    request.messageType = "RoomMessage";
    request.eventType = "startGame";
    console.log("CURRENT ROOM ID: " + this.currentRoomId);
    request.data.roomId = this.currentRoomId;
    this.serverConn.send(JSON.stringify(request));
}

Client.prototype.sendTopic = function(topic) {
    var request = new Message();
    request.messageType = "GameMessage";
    request.eventType = "topicChosen";
    request.data.topic = topic;
    request.data.roomId = client.getCurrentRoomId();
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
        request.messageType = "GameMessage";
        request.eventType = "submission";
        request.data = {submission: entry.data, roomId: this.getCurrentRoomId()};
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
            url: 'http://' + window.location.hostname + ':8081/file-upload',
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
    request.messageType = "GameMessage";
    request.eventType = "winnerChosen";
    request.data.winner = winner;
    request.data.roomId = client.getCurrentRoomId();
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
