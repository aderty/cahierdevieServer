var fs = require('fs'),
    //async = require('async'),
    _ = require('underscore'),
    servers = require('./servers.json');

var serversIndex = 0; // Index

exports.getConfig = function(req, res, next) {
    console.log("demande de config");

    var id = req.params.id || req.body.id;
    console.log(id);
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ id: id, urlUpload: nextServer(), state: [] });
    res.end();
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