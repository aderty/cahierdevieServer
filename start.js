var fs = require('fs'),
    //async = require('async'),
    _ = require('underscore'),
    config = require('./config.json');

var serversIndex = 0;
var servers = config.servers;

exports.getConfig = function(req, res, next) {
    if (req.method === 'OPTIONS') {
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
    }
    console.log("demande de config");

    var id = req.params.id || req.body.id;

    res.json({ id: id, urlUpload: nextServer(), state: [] });
};

function nextServer() {
    var url = servers[serversIndex];
    if (serversIndex == servers.length - 1) {
        serversIndex = 0;
    }
    else {
        serversIndex = serversIndex + 1;
    }
    return url;
}