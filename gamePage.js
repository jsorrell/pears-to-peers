var client = new Client(gamePageCb);

$(document).ready(function() {
    displayMessage("Connecting to Server", "connection-info");
    displayMessage("Please wait for Connection", "room-info", "bad");

    $("#start-game-button,#topic-submission,#content-submission,#available-submissions,#select-winner").hide();

    client.connect("ws://localhost:8080");
});

function gamePageCb(eventName) {
    switch (eventName) {
        case "winnerChosen":
            $("#winner-list").show();
            $("#winner-button").show();
            for (var player in client.peers) {
                var el = document.createElement("option");
                el.textContent = client.peers[player];
                el.value = player;
                winnerList.appendChild(el);    
            }
            
            break;
        case "roomList":
            fillRoomList();
            break;
            
        case "peerList":
            break;
            
        case "roomCreated":
            break;
    
        case "joinedRoom":
            displayMessage("You have joined room " + client.currentRoomId, "room-info", "good");
            console.log(client);
            $("#start-game-button").show();
            break;
            
        case "submission":
            var submissionList = document.getElementById("submission-list");
            submissionList.options.length = 0;
            for(var i=0; i<client.submissions.length; i++) {
                var el = document.createElement("option");
                el.textContent = client.submissions[i];
                el.value = client.submissions[i];   
                submissionList.appendChild(el);
            }
            
            break;
            
        case "noWinnerChosen":
            $("#winner-list").hide();
            $("#winner-button").hide();
            break;

        case "startGame":
            displayMessage("The game has started", "room-info", "good");
            $("#room-selection").hide();
            $("#room-creation").hide();
            $("#start-game-button").hide();
            break;

        case "leaderChosen":
            $("#topic-submission").show();
            break;
        case "topic":
            displayMessage("The topic is " + client.topic, "room-info");
            $("#topic-submission").hide();
            $("#content-submission").show();  
            break;
        case "connectedToServer":
            displayMessage("Successfully connected to server.", "connection-info", "good");
            if (client.rooms.length == 0) {
                displayMessage("Please create a room", "room-info");
            } else {
                displayMessage("Choose a room", "room-info", "good");
            }
            break;
        case "serverConnectionClosed":
            displayMessage("Connection to server closed", "connection-info", "bad");
            displayMessage("Please refresh page", "room-info", "bad");
            break;

    }

}
function fillRoomList(){
    var roomList = document.getElementById("room-list");
    roomList.options.length = 0;
    var rooms = client.getRooms();
    for(var room in rooms) {
        var el = document.createElement("option");
        el.textContent = rooms[room];
        el.value = rooms[room];
        roomList.appendChild(el);
    }
}

function createRoomOnClick(){
    var roomId = document.getElementById("room-name").value;
    client.createRoom(roomId);
    //.value then .reset()
}

function joinRoomOnClick(){
    var roomId = document.getElementById("room-list").value;
    client.joinRoom(roomId);
}

function startGameOnClick(){
    client.startGame();
}

function submitTopicOnClick(){
    var topic = document.getElementById("topic-submission-input").value;
    console.log("sending topic " + topic);
    client.sendTopic(topic);
}
    
function submitContentOnClick(){
    var request = new Message();
    var submission = document.getElementById("content-submission-input").value;
    client.sendEntry(submission);
}

function sendWinnerOnClick(){
    var winnerMsg = new Message();
    var winner = document.getElementById("winner-list").value;
    client.sendWinner(winner);
    $("#winner-button").hide();
    $("#winner-list").hide();
}

//status is good, neutral, or bad
function displayMessage(message,id,status){
    $("#" + id).text(message);
    var color;
    if (status === "good") color = "lightgreen";
    else if (status === "bad") color = "lightcoral";
    else color = "lightblue";
    $("#" + id).css("background-color",color);
}

// function viewSubmissionOnClick(){
//     var selectedSubmission = document.getElementById("submissionList").value;
//     var submissionViewer = document.getElementById("submissionViewer");
//     submissionViewer.src = selectedSubmission;
//     submissionViewer.contentWindow.location.reload();
// }
