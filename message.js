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
        this.eventType = "";
        this.messageType = "";
        this.data = {};
    }
    
    this.get = function (dataField) {
        return this.data[dataField];
    }
}

//EXPORTS
exports.Message = Message;

