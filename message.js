             /*********/
             /*Message*/
             /*********/

//DESCRIPTION: Represents the messages used for communication with players

//CREATOR:
function Message(MessageCopy){
    if(MessageCopy != undefined){ //copy constructor
        for(var key in MessageCopy){
            this[key] = MessageCopy[key];
        }
    } else{
//DATA MEMBERS:
    this.messageType = "";
    this.eventName = "";
    this.roomId = "";
    this.yourId = "";
    this.leader = "";
    this.topic = "";
    this.winner = -1;
    this.scores = {}
    this.submission = "";
    this.allSubmissions = {};
    this.roomList = [];
    this.peerList = [];
    }
    
//MANIPULATORS:
    this.setAllSubmissions = function(allSubmissions){
        this.allSubmissions = allSubmissions;
    }
    
    this.setEventName = function(eventName){
        this.eventName = eventName;
    }
    
    this.setYourId = function(id) {
        this.yourId = id;
    }
    
    this.setLeader = function(leader) {
        this.leader = leader;
    }
    
    this.setPeerList = function(peerList){
        this.peerList = peerList;
    }
    
    this.setReceiverId = function(socketId){
        this.receiverId = socketId;
    }

    this.setScores = function(scores){
        this.scores = scores;
    }
    
    this.setMessageType = function(messageType) {
        this.messageType = messageType;
    }
    
    this.setRoomId = function(roomId){
        this.roomId = roomId;
    }
    
    this.setRoomList = function(roomList){
        this.roomList = roomList;
    }
    
    this.setSenderId = function(socketId){
        this.senderId = socketId;
    }
    
    this.setSubmission = function(submission) {
        this.submission = submission;
    }
    
    this.setTopic = function(topic){
        this.topic = topic;
    }
    
    this.setWinner = function(winner){
        this.winner = winner;
    }

//ACCESSORS
    this.getAllSubmissions = function(){
        return this.allSubmissions;
    }
    
    this.getEventName = function(){
        return this.eventName;
    }
    
    this.getLeader = function(){
        return this.leader;
    }
    
    this.getYourId = function() {
        return this.yourId;
    }
    
    this.getMessageType = function(){
        return this.messageType;
    }
    
    this.getPeerList = function(){
        return this.peerList;
    }

    this.getReceiverId = function(){
        return this.receiverId;
    }
    
    this.getRoomId = function(){
        return this.roomId;
    }
    
    this.getRoomList = function(){
        return this.roomList;
    }
    
    this.getScores = function(){
        return this.scores;
    }
    
    this.getSenderId = function(){
        return this.senderId;
    }
    
    this.getSubmission = function(){
        return this.submission;
    }
    
    this.getTopic = function(){
        return this.topic;
    }
    
    this.getWinner = function(){
        return this.winner;
    }
}

//EXPORTS
exports.Message = Message;

