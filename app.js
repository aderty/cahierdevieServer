
/// <reference path="~/lib/node-vsdoc.js" />

/**
 * Module dependencies.
 */

var config = require('./config.json');

var express = require('express'),
    http = require('http'),
    path = require('path'),
    publish = require('./publish'),
    user = require('./user'),
    mail = require('./mail'),
    start = require('./start'),
    PORT = process.env.PORT || config.env.PORT,
    app = express();

app.use(express.logger("dev"));

app.use(express.bodyParser({
    uploadDir: __dirname + '/tmp',
    keepExtensions: true
}));

// all environments
app.set('port', PORT);
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

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
console.log("Mise en place des routes");
// Ajout via POST
app.get('/test', function(req, res){
    console.log("test");
    //res.writeHead("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Origin', '*');
    res.write("<!DOCTYPE html><html><head><title>Mon cahier de vie</title><script src='http://code.jquery.com/jquery-2.0.3.min.js' type='text/javascript'></script></head><body>Hello !</body></html>");
    res.end();
});
app.get('/oauth_callback', function (req, res) {
    console.log(req.body);
    res.write("ok");
    res.end();
});
console.log("/test -> OK");
app.get('/send-cahier/:id', publish.addCahier);
console.log("/send-cahier GET -> OK");

app.post('/send-cahier/:id', publish.addCahier);
console.log("/send-cahier POST -> OK");

app.post('/send-picture-cahier/:id', publish.addImage);
console.log("/send-picture-cahier POST -> OK");

app.post('/update-email', mail.updateEmail);
console.log("/update-email POST -> OK");

app.get('/getConfig/:id', start.getConfig);
console.log("/getConfig GET -> OK");

//app.options('/getConfig', function(req, res, next) {
app.options('*', function (req, res, next) {
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
console.log("/getConfig OPTIONS -> OK");

app.post('/getConfig', start.getConfig);
console.log("/getConfig POST -> OK");

app.post('/login/v1', user.routes.login);
app.post('/new/v1', user.routes.create);
app.post('/update/v1', user.routes.update);
app.post('/sync/v1', user.routes.sync);
app.post('/add/v1', user.routes.add);
app.post('/remove/v1', user.routes.remove);
app.post('/addUser/v1', user.routes.addUser);
app.post('/removeUser/v1', user.routes.removeUser);
app.post('/addPushId/v1', user.routes.addPushId);



//app.post('/images', publish.addImage); // endpoint to post new images
//app.get('/images', publish.getImages); // endpoint to get list of images

if (!module.parent) {
    app.listen(app.get('port'));
    console.log('Server running at http://127.0.0.1:' + PORT);
}

process.on('uncaughtException', function (exception) {
    //exception.response.writeHead(exception.code, {'Content-Type': 'text/html'});
    //exception.response.end('Error ' + exception.code + ' - ' + exception.message);
});
