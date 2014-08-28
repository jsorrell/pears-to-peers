var client = new Client(gamePageCb);

$(document).ready(function() {
    displayMessage("Connecting to Server", "connection-info");
    displayMessage("Please wait for Connection", "room-info", "bad");
    viewState("disconnected");

    client.connect("ws://localhost:8080");
});

function gamePageCb(eventName) {
    switch (eventName) {
        case "winnerChosen":
            $("#submission-list").html("");
            break;
        case "roomList":
            if (client.currentRoomId == null) {
                console.log(client.currentRoomId);
                if (client.rooms.length === 0) {
                    displayMessage("Please create a room", "room-info");
                } else {
                    displayMessage("Choose a room", "room-info", "good");
                }
            }
            fillRoomList();
            break;
        case "chooseWinner":
            if (client.isLeader) {
                viewState("select-winner");
                displayMessage("Choose the winner", "room-info", "bad");
            } else {
                viewState("view-submissions");
                displayMessage("View others' submissions", "room-info");
            }
            console.log(client.submissions);
            $.each(client.submissions,function(index, val) {
                console.log("index:");
                console.log(index);
                $("#submission-list").append("<option value=\""+index+"\">"+val+"</option>");
            });
            break;
            
        case "peerList":
        case "scores":
            $("#score-table-ids").html("");
            $("#score-table-scores").html("");
            $.each(client.scores,function (client,score) {
                $("#score-table-ids").append("<td>"+client+"</td>");
                $("#score-table-scores").append("<td>"+score+"</td>");
            });
            break;
            
        case "roomCreated":
            break;
    
        case "joinedRoom":
            displayMessage("You have joined room " + client.currentRoomId, "room-info", "good");
            viewState("in-room");
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
        case "startGame":
            displayMessage("The game has started. Choosing leader.", "room-info", "good");
            break;

        case "leaderChosen":
            if (client.isLeader) {
                viewState("submitting-topic");
                displayMessage("Submit a topic", "room-info", "bad")
            } else {
                viewState("waiting");
                displayMessage("Please wait for topic to be submitted by leader("+client.leaderId+")", "room-info")
            }
            break;

        case "topic":
            displayMessage("The topic is " + client.topic, "room-info");
            if (client.isLeader) {
                viewState("waiting");
                displayMessage("Waiting for content to be submitted", "room-info")
            } else {
                viewState("submitting-content");
                displayMessage("Please submit content for topic \"" + client.topic + "\"!", "room-info", "good")
            }
            break;
        case "connectedToServer":
            displayMessage("Connected to server", "connection-info", "good");
            console.log(client.rooms);
            displayMessage("Please create a room", "room-info");
            viewState("join-room");
            break;
        case "serverConnectionClosed":
            displayMessage("Connection to server closed", "connection-info", "bad");
            displayMessage("Please refresh page", "room-info", "bad");
            viewState("disconnected");
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
    console.log("Winner: ");
    console.log($("#winner-list").val());
    var winner = parseInt($("#submission-list").val());
    client.sendWinner(winner);
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

/* show the parts of the page for the gamestate */
function viewState(state){
    console.log("viewing " + state);
    $(".message-box").show();
    $("." + state).show();
    $("body > :not(.message-box, ."+state+")").hide();
}

// function viewSubmissionOnClick(){
//     var selectedSubmission = document.getElementById("submissionList").value;
//     var submissionViewer = document.getElementById("submissionViewer");
//     submissionViewer.src = selectedSubmission;
//     submissionViewer.contentWindow.location.reload();
// }
