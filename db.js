var config = require('./config.json');

//var databaseURI = "mongodb://localhost:27017/cahierdevie";
var databaseURI = 'mongodb://' + config.db.user + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/' + config.db.database;
var collection = "emails";
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;

var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

var db, emails, users, cahiers, user_cahiers;

mongodb.MongoClient.connect(databaseURI, function (err, database) {
    if (err) {
        console.log(err);
        throw err;
    }
    db = database;
    emails = db.collection(collection, function(err, email) {
        if (err) throw err;
        module.exports.emails = email;
        events.emit('connected', null);
    });
    users = db.collection("users", function(err, users) {
        if (err) throw err;
        module.exports.users = users;
        events.emit('users:connected', null);
    });
    cahiers = db.collection("cahiers", function (err, cahiers) {
        if (err) throw err;
        module.exports.cahiers = cahiers;
        events.emit('cahiers:connected', null);
    });
    user_cahiers = db.collection("user_cahiers", function (err, user_cahiers) {
        if (err) throw err;
        module.exports.user_cahiers = user_cahiers;
        events.emit('user_cahiers:connected', null);
    });
});

module.exports.instance = db;
module.exports.emails = emails;
module.exports.users = users;
module.exports.cahiers = cahiers;
module.exports.user_cahiers = user_cahiers;
module.exports.events = events;
module.exports.ObjectID = ObjectID;
