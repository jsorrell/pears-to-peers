var client;
var file;


$(document).ready(function() {
    $('#submit-file-button').prop({disabled: true});
    $('#winner-button').prop({disabled: true});
    $('#view-submission-button').prop({disabled: true});
    $("form").submit(function (e){
        e.preventDefault();
    });
    displayMessage("Connecting to Server", "connection-info");
    displayMessage("Please wait for Connection", "room-info", "bad");
    viewState("disconnected");
    client = new Client(gamePageCb);


    $("#file-submission-input").on('change', function (event)
    {
        var files = event.target.files;
        if (files.length === 0){
        $('#submit-file-button').prop({disabled: true});
        } else {
        console.log("a");
        file = $('#file-submission-input')[0].files[0];
        $('#submit-file-button').prop({disabled: false});
        }
    });

    $("#file-submit-form").on('submit', function (event)
    {
        client.sendEntry({type: "file", data: file});
    });

    $("#text-submit-form").on('submit', function (event)
    {
        var text = $("#text-submission-input").val();
        console.log("submitting text \"" + text + '"');
        client.sendEntry({type: "text", data: text});
    });

    $("#topic-submission").on('submit', function (event)
    {
        var topic = $("#topic-submission-input").val();
        console.log("sending topic " + topic);
        client.sendTopic(topic);
    });

    $("#room-creation-form").on('submit', function (event)
    {
        var name = $("#room-name-input").val();
        console.log("Attempting to create room " + name);
        client.createRoom(name);
    });

    $('#view-submission-button').on('click',function (event)
    {
        var submissionId = $('#submission-list').val();
        var submission = client.submissions[submissionId];
        console.log(submission);

        var genType = submission.type.split('/')[0];
        switch (genType) {
            case 'text':
                $('#submission-view-area').html(submission.data);
                break;

            case 'video':
                $('#submission-view-area').html('<video width="320" height="240" controls>\
<source src="'+submission.data+'" type="'+submission.type+'">\
Your browser does not support the video tag.\
</video>');
                break;

            case 'image':
                $('#submission-view-area').html('<img width="320" height="240" src="'+ submission.data + '" />');
                break;

            case 'audio':
                $('#submission-view-area').html('<audio controls>\
<source src="'+ submission.data+'" type="'+submission.type+'" />\
Your browser does not support the audio element.\
</audio>');
                break;
        }
    });

    $('#winner-button').click(function (event)
    {
        var winner = parseInt($('#submission-list').val());
        client.sendWinner(winner);
    });

    $('#choose-username-form').submit(function (event)
    {
        var username = $("#choose-username-input").val();
        console.log("sending username " + username);
        client.sendUsername(username);
    });
});

function gamePageCb(eventName) {
    switch (eventName) {
        case "winnerChosen":
            console.log("emptying view area");
            $('#submission-view-area').empty();
            break;

        case "roomList":
            if (client.currentRoomId == null) {
                if (client.rooms.length === 0) {
                    displayMessage("Please create a room", "room-info");
                } else {
                    displayMessage("Choose a room", "room-info", "good");
                }
            }
            fillRoomList();
            break;

        case "chooseWinner":
            var submissionList = document.getElementById("submission-list");
            submissionList.options.length = 0;
            $('#winner-button').prop({disabled: true});
            $('#view-submission-button').prop({disabled: true});
            for (var submissionId in client.submissions) {
                var el = document.createElement("option");
                var submission = client.submissions[submissionId];
                console.log(submission);
                el.textContent = submission.data.slice(submission.data.lastIndexOf("/")+1);
                console.log("submission3:");
                console.log(client.submissions[submissionId]);
                el.value = submissionId;
                submissionList.appendChild(el);
            }
            if (submissionList.options.length != 0) {
                $('#winner-button').prop({disabled: false});
                $('#view-submission-button').prop({disabled: false});
            }
            break;

        case "peerList":
        case "scores":
            $("#score-table-names").html("");
            $("#score-table-scores").html("");
            $.each(client.scores,function (client,score) {
                $("#score-table-names").append("<td>"+client+"</td>");
                $("#score-table-scores").append("<td>"+score+"</td>");
            });
            break;

        case "joinedRoom":
            displayMessage("You have joined room " + client.currentRoomId, "room-info", "good");
            viewState("in-room");
            break;

        case "startGame":
            console.log("displayMessage ing");
            displayMessage("The game has started", "room-info", "good");
            break;

        case "state":
            switch(client.state) {
                case "chooseTopic":
                    if (client.isLeader) {
                        viewState("submitting-topic");
                        displayMessage("Submit a topic", "room-info", "bad")
                    } else {
                        viewState("waiting");
                        displayMessage("Please wait for topic to be submitted by leader("+client.leaderId+")", "room-info");
                    }
                    break;

                case "submissionPeriod":
                    if (client.isLeader) {
                        viewState("waiting");
                        displayMessage("Waiting for content to be submitted", "room-info")
                    } else {
                        viewState("submitting-content");
                        displayMessage("Please submit content for topic \"" + client.topic + "\"!", "room-info", "good")
                    }
                    break;

                case "chooseWinner":
                    if (client.isLeader) {
                        viewState("select-winner");
                        displayMessage("Choose the winner", "room-info", "bad");
                    } else {
                        viewState("view-submissions");
                        displayMessage("View others' submissions", "room-info");
                    }
                    break;

            }
            break;

        case "topic":
            displayMessage("The topic is " + client.topic, "room-info");
            break;
        case "connectedToServer":
            displayMessage("Connected to server", "connection-info", "good");
            viewState("choose-username");
            break;
        case "usernameSuccess":
            displayMessage("Please create a room", "room-info");
            viewState("join-room");

            break;
        case "serverConnectionClosed":
            displayMessage("Connection to server closed", "connection-info", "bad");
            displayMessage("Please refresh page", "room-info", "bad");
            viewState("disconnected");
            break;
        case "fileUploadProgress":
            $("#file-upload-progress-bar").val(client.fileUploadProgress);
            break;
        case "fileUploadError":
            $("#file-upload-progress-bar").replaceWith('<p>Error in File Upload</p>');
            break;
        case "stopGame":
            viewState("in-room");
            displayMessage("Waiting to start game", "room-info");
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


//status is good, neutral, or bad
function displayMessage(message,id,status){
    $("#" + id).text(message);
    var color;
    if (status === "good") color = "lightgreen";
    else if (status === "bad") color = "lightcoral";
    else color = "lightblue";
    $("#" + id).css("background-color",color);
}

var curState;
function setState(state)
{
    if (state == curState) return;
    switch(state) {
        case 'choose-username':
        break;
        case 'join-room':
        break;
        case 'in-room':
        break;
        case 'submitting-topic':
        break;
        case 'waiting-on-topic':
        break;
        case 'submitting-content':
        break;
        case 'waiting-on-content':
        break;
        case 'choosing-winner':
        break;
        case 'waiting-on-winner':
        break;
        case 'connecting':
        case 'disconnected':
        break;
    }
    curState = state;
}
/* show the parts of the page for the gamestate */
function viewState(state)
{
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
