var http = require('http');
var fs = require ('fs');

var filename = 0
console.log("STARTING STREAMING SERVER ON PORT 8081");
http.createServer(uploadHandler).listen(8081);

function uploadHandler(request,response){
    response.writeHead(200,{'Access-Control-Allow-Origin': '*','Access-Control-Allow-Headers':'Origin, X-Requested-With, Content-Type, Accept'});
    var destinationFile = fs.createWriteStream(filename.toString() + ".m4v");    
    filename += 1;
    request.pipe(destinationFile);

    var fileSize = request.headers['content-length'];
    var uploadedBytes = 0;

    request.on('data',function(d){
        console.log("got data");              
        uploadedBytes += d.length;
        var p = (uploadedBytes/fileSize) * 100;
        response.write("Uploading " + parseInt(p)+ " %\n");
        console.log("Uploading " + parseInt(p));
    });

    request.on('end', function(){
        response.end("File Upload Complete");
    });
}


