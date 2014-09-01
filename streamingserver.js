var fs = require ('fs');
var express = require('express');
var multiparty = require("connect-multiparty");

console.log("STARTING STREAMING SERVER ON PORT 8081");
var app = express();
app.listen(8081);

app.use(multiparty({uploadDir:'./uploads'})); //TODO: deprecated

app.post("/file-upload",uploadHandler);

function uploadHandler(req,res)
{   
    var tmp_path = req.files.upload.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = './uploads/' + req.files.upload.name;
    console.log(target_path);
    console.log(tmp_path);
    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, target_path);
}


