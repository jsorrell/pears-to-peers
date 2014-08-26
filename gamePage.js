//var Client = require('./client');

var client = new Client(gamePageCb);
window.onload = main();

function main() {
    /////test
    client.connect("ws://localhost:8080/");
    // client.connect("ws://192.168.2.9:8080/");

}

function gamePageCb(eventName) {
    switch (eventName) {
        case "winnerChosen":
            var winnerList = document.getElementById("winner-list")
            winnerList.style.visibility="visible";
            document.getElementById("winner-button").style.visibility="visible";
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
            document.getElementById("start-game-button").style.visibility="hidden";
            break;
    
        case "joinedRoom":
            currentRoomDisplay = document.getElementById("current-room-display");
            currentRoomDisplay.innerHTML = "In room \"" + client.currentRoomId +"\"";
            currentRoomDisplay.style.color = "green";
            document.getElementById("start-game-button").style.visibility="visible";
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
            document.getElementById("winner-list").style.visibility="hidden";
            document.getElementById("winner-button").style.visibility="hidden";
            break;

        case "startGame":
            document.getElementById("room-selection").style.visibility="hidden";
            document.getElementById("room-creation").style.visibility="hidden";
            document.getElementById("start-game-button").style.visibility="hidden";
            break;

        case "leaderChosen":
            document.getElementById("topic-submission").style.visibility="visible";
            break;
        case "topic":
            document.getElementById("topic-submission").style.visibility="hidden";
            document.getElementById("answer-submission").style.visibility="visible";

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
    var topic = document.getElementById("topic-submission").value;
    client.sendTopic(topic);
}
    
function submitContentOnClick(){
    var request = new Message();
    var submission = document.getElementById("content-submission").value;
    client.sendEntry(submission);
}

function sendWinnerOnClick(){
    var winnerMsg = new Message();
    var winner = document.getElementById("winner-list").value;
    client.sendWinner(winner);
    document.getElementById("winner-list").style.visibility="hidden";
    document.getElementById("winner-button").style.visibility="hidden";
}

// function viewSubmissionOnClick(){
//     var selectedSubmission = document.getElementById("submissionList").value;
//     var submissionViewer = document.getElementById("submissionViewer");
//     submissionViewer.src = selectedSubmission;
//     submissionViewer.contentWindow.location.reload();
// }
