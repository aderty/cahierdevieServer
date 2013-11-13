var config = require('./config.json');

//var databaseURI = "mongodb://localhost:27017/cahierdevie";
var databaseURI = 'mongodb://' + config.db.user + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/' + config.db.database;
var collection = "emails";
var mongodb = require('mongodb');

var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

var db, coll;

mongodb.MongoClient.connect(databaseURI, function (err, database) {
    if (err) {
        console.log(err);
        throw err;
    }
    db = database;
    coll = db.collection(collection, function(err, email) {
        if (err) throw err;
        module.exports.emails = email;
        events.emit('connected', null);
    });
});

module.exports.instance = db;
module.exports.emails = coll;
module.exports.events = events;
