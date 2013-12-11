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

function checkUser(_id, fn) {
    db.users.findOne({ _id: new db.ObjectID(_id) }, function(err, user) {
        if (err) console.error(err);
        else console.info("user trouvé");
        if (fn) fn(err, user);
    });
}

var routes = {
    login: function(req, res) {
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
            pwd: user.pwd
        }
        db.users.findOne({ email: user.email }, function(err, save) {
            if (err) console.error(err);
            if (!save) {
                console.log("Création");
                console.log(user);
                // Chiffrage du pass en sha1
                var hash = crypto.createHash('sha1').update(pwd).digest("hex");
                user.pwd = hash;
                db.users.insert(user, { safe: true }, function(err, newUser) {
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
        db.users.update({ _id: new db.ObjectID(user._id) }, user, function(err, save) {
            if (err) console.error(err);
            else console.log("user modifié");
            if (typeof save == "object") {
            }
            dataCallback(res)(err, save);
        });
    },
    sync: function(req, res) {
        checkUser(req.body.user._id, function(err, user) {
            if (!user) {
                return dataCallback(res)("Problème d'authentification", user);
            }
            db.user_cahiers.find({ user: user._id }).toArray(function(err, users_cahiers) {
                if (err) console.error(err);
                else console.log("user_cahiers trouvé");
                console.log(users_cahiers.length);
                if (!users_cahiers || !users_cahiers.length) {
                    return dataCallback(res)(err, {});
                }
                var i = 0, l = users_cahiers.length, ids = [];
                for (; i < l; i++) {
                    ids.push(users_cahiers[i].cahier);
                }
                db.cahiers.find({ _id: { $in: ids} }).toArray(function(err, cahiers) {
                    if (err) console.error(err);
                    else console.log("cahiers trouvé");
                    i = 0, l = cahiers.length, toSync = [];
                    for (; i < l; i++) {
                        if (!req.body.enfants[cahiers[i].id] || (req.body.enfants[cahiers[i].id] && req.body.enfants[cahiers[i].id].tick < cahiers[i].tick)) {
                            toSync.push(cahiers[i]);
                        }
                    }
                    dataCallback(res)(err, toSync);
                });
            });
        });
    },
    add: function(req, res) {
        checkUser(req.body.user._id, function(err, user) {
            if (!user) {
                return dataCallback(res)("Problème d'authentification", user);
            }
            console.log(req.body.cahier);
            var cahier = req.body.cahier;
            if (cahier._id) {
                cahier._id = new db.ObjectID(cahier._id);
            }
            else {
                if (!cahier.created) {
                    cahier.created = new Date();
                }
            }
            db.cahiers.save(req.body.cahier, { safe: true }, function(err, newCahier) {
                if (err) console.error(err);
                if (!newCahier) {
                    return dataCallback(res)("Problème d'enregistrement du cahier", newCahier);
                }
                if (!newCahier._id) {
                    console.info("update");
                    return dataCallback(res)(err, { success: true });
                }
                console.info("create");
                console.log(newCahier);
                db.user_cahiers.save({ user: user._id, cahier: newCahier._id }, { safe: true }, function(err, newCahierUser) {
                    if (err) console.error(err);
                    console.log("newCahierUser");
                    console.log(newCahierUser);
                    if (!newCahierUser) {
                        return dataCallback(res)("Problème d'enregistrement du cahier", newCahierUser);
                    }
                    dataCallback(res)(err, {
                        _id: newCahier._id.toString()
                    });
                });
            });
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
        checkUser(req.body.user._id, function(err, user) {
            if (!user) {
                return dataCallback(res)("Problème d'authentification", user);
            }
            db.user_cahiers.findOne({ user: new db.ObjectID(req.body.user._id), cahier: new db.ObjectID(req.body.cahier._id) }, function(err, cahierUser) {
                if (err) console.error(err);
                console.info("cahierUser");
                if (!cahierUser) {
                    return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                }
                db.cahiers.remove({ _id: new db.ObjectID(req.body.cahier._id) }, function(err, result) {
                    db.user_cahiers.remove({cahier: new db.ObjectID(req.body.cahier._id)}, function(err, result) {
                        if (err) console.error(err);
                    });
                    dataCallback(res)(err, result);
                });
                
            });
        });
    }
};

exports.routes = routes;