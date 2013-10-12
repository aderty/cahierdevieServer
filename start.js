var fs = require('fs'),
    //async = require('async'),
    _ = require('underscore'),
    config = require('./config.json');

var serversIndex = 0;
var servers = config.servers;

exports.getConfig = function(req, res, next) {
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