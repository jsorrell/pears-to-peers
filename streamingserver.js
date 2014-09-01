var http = require('http');
var fs = require ('fs');

var filename = 0
console.log("STARTING STREAMING SERVER ON PORT 8081");
http.createServer(uploadHandler).listen(8081);

function uploadHandler(request,response){
    response.writeHead(200);
    var destinationFile = fs.createWriteStream(filename.toString());      
    request.pipe(destinationFile);

    var fileSize = request.headers['content-length'];
    var uploadedBytes = 0 ;

    request.on('data',function(d){                
        uploadedBytes += d.length;
        var p = (uploadedBytes/fileSize) * 100;
        response.write("Uploading " + parseInt(p)+ " %\n");
    });

    request.on('end', function(){
        response.end("File Upload Complete");
    });
}


