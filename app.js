/// <reference path="~/lib/node-vsdoc.js" />

/**
 * Module dependencies.
 */

var config = require('./config.json');

var express = require('express'),
    http = require('http'),
    path = require('path'),
    publish = require('./publish'),
    mail = require('./mail'),
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

app.post('/update-email', mail.updateEmail);

app.get('/getConfig/:id', start.getConfig);
app.options('/getConfig', function(req, res, next) {
        console.log('!OPTIONS');
        var headers = {};
        // IE8 does not allow domains to be specified, just the *
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        res.writeHead(200, headers);
        res.end();
        return;
});
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
