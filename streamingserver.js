var http = require('http');
var fs = require ('fs');

var filename = 0
console.log("STARTING STREAMING SERVER ON PORT 8081");
http.createServer(uploadHandler).listen(8081);

function uploadHandler(request,response){
    var lastPercent = 0;
    response.writeHead(200,{'Access-Control-Allow-Origin': '*','Access-Control-Allow-Headers':'Origin, X-Requested-With, Content-Type, Accept'});
    var destinationFile = fs.createWriteStream("uploads/" + filename.toString());    
    filename += 1;
    request.pipe(destinationFile);

    var fileSize = request.headers['content-length'];
    var uploadedBytes = 0;

    request.on('data',function(d){
        uploadedBytes += d.length;
        var p = parseInt((uploadedBytes/fileSize) * 100);
        if (p != lastPercent) {
            response.write(parseInt(p) + '-');
            console.log('"UploadComplete": ' + parseInt(p));
            lastPercent = p;
        }
    });

    request.on('end', function(){
        response.end();
    });
}


