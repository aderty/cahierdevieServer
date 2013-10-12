﻿/// <reference path="~/lib/node-vsdoc.js" />

/**
 * Module dependencies.
 */

var config = require('./config.json');

var express = require('express'),
    http = require('http'),
    path = require('path'),
    publish = require('./publish'),
    start = require('./start'),
    PORT = process.env.PORT || config.env.PORT,
    app = express();

app.use(express.logger("dev"));

app.use(express.bodyParser({
    uploadDir: __dirname + '/tmp',
    keepExtensions: true
}));

app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, './public')));

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});
 
// Mise à jour via POST
//app.post('/data-users/:id', routes.users.update);
 
// Ajout via POST
app.get('/test', function(req, res){
    console.log("test");
    res.write("ok");
    res.end();
});
app.get('/send-cahier/:id', publish.addCahier);
app.post('/send-cahier/:id', publish.addCahier);
app.post('/send-picture-cahier/:id', publish.addImage);

app.get('/getConfig/:id', start.getConfig);
app.post('/getConfig', start.getConfig);



app.post('/images', publish.addImage); // endpoint to post new images
app.get('/images', publish.getImages); // endpoint to get list of images

if (!module.parent) {
    app.listen(PORT);
    console.log('Server running at http://127.0.0.1:' + PORT);
}

process.on('uncaughtException', function (exception) {
    //exception.response.writeHead(exception.code, {'Content-Type': 'text/html'});
    //exception.response.end('Error ' + exception.code + ' - ' + exception.message);
});