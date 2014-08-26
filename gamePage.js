//var Client = require('./client');

var client = new Client(gamePageCb);
window.onload = main();

function main() {
    /////test
    client.connect("ws://localhost:8080/");
    // client.connect("ws://192.168.1.9:8080/");

}

function gamePageCb(eventName) {
    switch (eventName) {
        case "Choose Winner":
            var winnerList = document.getElementById("winnerList")
            winnerList.style.display="block";
            document.getElementById("winnerButton").style.display="block";
            for (var player in client.peers) {
                var el = document.createElement("option");
                el.textContent = client.peers[player];
                el.value = player;
                winnerList.appendChild(el);    
            }
            
            break;
        case "RoomList":
            fillRoomList();
            break;
            
        case "PeerList":
            break;
            
        case "roomCreated":
            document.getElementById("startGameButton").style.display="block";
            break;
    
        case "joinedRoom":
            document.getElementById("startGameButton").style.display="block";
            break;
            
        case "submission":
            var submissionList = document.getElementById("submissionList");
            submissionList.options.length = 0;
            for(var i=0; i<client.submissions.length; i++) {
                var el = document.createElement("option");
                el.textContent = client.submissions[i];
                el.value = client.submissions[i];   
                submissionList.appendChild(el);
            }
            
            break;
            
        case "No Winner Chosen In Time":
            document.getElementById("winnerList").style.display="none";
            document.getElementById("winnerButton").style.display="none";
            break;
    }

}
function fillRoomList(){
    var roomList = document.getElementById("RoomList");
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
    var roomId = document.getElementById("RoomName").value;
    client.createRoom(roomId);
    //.value then .reset()
}

function joinRoomOnClick(){
    var roomId = document.getElementById("RoomList").value;
    client.joinRoom(roomId);
}

function startGameOnClick(){
    client.startGame();
}

function submitTopicOnClick(){
    var topic = document.getElementById("topicSubmission").value;
    client.sendTopic(topic);
}
    
function submitContentOnClick(){
    var request = new Message();
    var submission = document.getElementById("contentSubmission").value;
    client.sendEntry(submission);
}

function sendWinnerOnClick(){
    var winnerMsg = new Message();
    var winner = document.getElementById("winnerList").value;
    client.sendWinner(winner);
    document.getElementById("winnerList").style.display="none";
    document.getElementById("winnerButton").style.display="none";
}

function viewSubmissionOnClick(){
    var selectedSubmission = document.getElementById("submissionList").value;
    var submissionViewer = document.getElementById("submissionViewer");
    submissionViewer.src = selectedSubmission;
    submissionViewer.contentWindow.location.reload();
}
