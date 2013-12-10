var fs = require('fs'),
    _ = require('underscore'),
    config = require('./config.json'),
    db = require("./db");
var crypto = require('crypto');
var shasum = crypto.createHash('sha1');
shasum.update("utf8");


db.events.once('users:connected', function() {
    console.log("users:connected to db");
    db.users.find({ id: "1" }).toArray(function(err, res) {
        if (res && res.length) {
            console.log("template récupéré");
            emailTemplate = res[0];
            templateContent = res[0].html;
        }
    });
});

/// Routes
function dataCallback(res) {
    return function (err, data) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        if (err) {
            res.send({ error: err });
        } else {
            // Il serait intéressant de fournir une réponse plus lisible en
            // cas de mise à jour ou d'insertion...
            res.send(data);
        }
    }
}

var routes = {
    login: function (req, res) {
        var user = req.body;
        var hash = crypto.createHash('sha1').update(user.pwd).digest("hex");
        user.pwd = hash;
        db.users.findOne({ email: user.email, pwd: user.pwd }, function(err, save) {
            if (err) console.error(err);
            else console.log("user trouvé");
            if (typeof save == "object") {
            }
            if (!save) {
                return dataCallback(res)("Problème d'authentification", save);
            }
            console.log(save);
            dataCallback(res)(err, save);
        });
    },
    // Lecture, via GET
    list: function(req, res) {
        res.header('Cache-Control', 'no-cache');
        if (req.query.search) {
            return data.users.search({ type: req.query.type, search: req.query.search }, dataCallback(res));
        }
        data.users.listUsers(dataCallback(res));
    },

    get: function(req, res) {
        var user = req.body;
        res.header('Cache-Control', 'no-cache');
        db.users.findOne({ email: user.email, pwd: user.pwd }, function(err, save) {
            if (err) console.error(err);
            else console.log("user modifié");
            if (typeof save == "object") {
            }
            dataCallback(res)(err, save);
        });
    },

    // Ajout ou Mise à jour via POST
    create: function(req, res) {
        var user = req.body;
        var pwd = user.pwd;
        user = {
            email: user.email,
            pseudo: user.pseudo,
            pwd: user.pwd,
        }
        db.users.findOne({ email: user.email }, function(err, save) {
            if (err) console.error(err);
            if (!save) {
                console.log("Création");
                console.log(user);
                // Chiffrage du pass en sha1
                var hash = crypto.createHash('sha1').update(pwd).digest("hex");
                user.pwd = hash;
                db.users.insert(user, { safe: true }, function (err, newUser) {
                    dataCallback(res)(err, newUser && newUser.length ? newUser[0] : null);
                });
            }
            else {
                dataCallback(res)("Email déjà utilisé", save);
            }
        });
    },
    // Ajout ou Mise à jour via POST
    update: function(req, res) {
        var user = req.body;
        var pwd = user.pwd;
        // Chiffrage du pass en sha1
        var hash = crypto.createHash('sha1').update(pwd).digest("hex");
        user.pwd = hash;
        db.users.update({ _id: user._id }, user, function(err, save) {
            if (err) console.error(err);
            else console.log("user modifié");
            if (typeof save == "object") {
            }
            dataCallback(res)(err, save);
        });
    },
    password: function(req, res) {
        data.users.passwordTest(req.session.username, req.body.oldPwd, function(err, ret) {
            if (err) {
                return dataCallback(res)(err);
            }
            data.users.passwordUpdate(req.session.username, req.body.pwd, dataCallback(res));
        });
    },
    // Ajout via POST
    remove: function(req, res) {
        data.users.removeUser(req.params.id, dataCallback(res));
        history.log(req.params.id, "[Admin " + req.session.username + "] Suppression de l'utilisateur " + req.params.id);
    }
};

exports.routes = routes;