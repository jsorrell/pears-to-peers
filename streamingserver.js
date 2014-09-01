var fs = require ('fs');
var express = require('express');
var multiparty = require("connect-multiparty");

console.log("STARTING STREAMING SERVER ON PORT 8081");
var app = express();
app.listen(8081);

app.use(multiparty({uploadDir:'./uploads'}));

app.post("/file-upload",uploadHandler);

function uploadHandler(req,res)
{
	if (req.files.upload){
		res.set({
			'Access-Control-Allow-Origin': '*'
		}).status(200).json({receivedFile: true});

		var tmp_path = req.files.upload.path;
	    // set where the file should actually exists
	    var target_path = './uploads/' + req.files.upload.name;
	    console.log(target_path);
	    console.log(tmp_path);
	    // move the file from the temporary location to the intended location
	    fs.rename(tmp_path, target_path);
	} else {
		res.set({
			'Access-Control-Allow-Origin': '*'
		}).status(200).json({receivedFile: false});
	}
    
}

// app.get("/:file",function (req,res)
// {
// 	console.log("requesting " + req.params.file);
// 	if (req.params.file === "file-upload");
// 	res.sendFile(__dirname+'/'+req.params.file)});
// }
app.use(express.static(__dirname));