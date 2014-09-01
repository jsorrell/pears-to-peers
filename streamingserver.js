var fs = require ('fs');
var express = require('express');
var bodyParser = require('body-parser');

console.log("STARTING STREAMING SERVER ON PORT 8081");
var app = express();
app.listen(8081);

app.use(bodyParser({uploadDir:'./uploads'})); //TODO: deprecated

app.post('/file-upload', uploadHandler);

function uploadHandler(req,res){
    console.log(req.body);
    console.log(req.files);
    
    req.form.on('progress', function(bytesReceived, bytesExpected) {
        console.log(((bytesReceived / bytesExpected)*100) + "% uploaded");
    });
    
    req.form.on('end', function(){
        res.end("File Upload Complete");
    });
    
    var tmp_path = req.files.upload.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = './uploads' + req.files.upload.name;
    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, target_path);
}


