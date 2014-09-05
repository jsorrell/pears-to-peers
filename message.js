             /*********/
             /*Message*/
             /*********/

//DESCRIPTION: Represents the messages used for communication with players

//CREATOR:
function Message(messageType,eventType,data){
    this.messageType = "";
    this.eventType = "";
    this.data = {};
    if(messageType){
        this.messageType = messageType;
    }
    if(messageType){
        this.eventType = eventType;
    }
    if(data){
        this.data = data;
    }

    this.get = function (dataField) {
        return this.data[dataField];
    }
}

Message.copyMessage = function(messageCopy)
{
    if (messageCopy) {
        var message = new Message();
        message.eventType = messageCopy.eventType;
        message.messageType = messageCopy.messageType;
        message.data = messageCopy.data;
        return message;
    }
}
//EXPORTS
exports.Message = Message;

