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
            var dbCahiers = db.cahiers.find({ users: { $elemMatch: { id: user._id}} });
            /*dbCahiers.count(function(e, count) {
            console.log(count);
            if (count == 0) {
            dataCallback(res)(err, []);
            }
            });*/
            dbCahiers.toArray(function(err, cahiers) {
                if (err) console.error(err);
                else console.log("cahiers array trouvé");
                console.log(cahiers);
                var i = 0, l = cahiers.length, toSync = [];
                for (; i < l; i++) {
                    console.log(cahiers[i].prenom);
                    if (req.body.enfants[cahiers[i].id]) {
                        console.log(new Date(req.body.enfants[cahiers[i].id].tick));
                    }
                    console.log(cahiers[i].tick);
                    if (!req.body.enfants[cahiers[i].id] || (req.body.enfants[cahiers[i].id] && new Date(req.body.enfants[cahiers[i].id].tick) < cahiers[i].tick)) {
                        //delete cahiers[i].users;
                        toSync.push(cahiers[i]);
                    }
                }
                dataCallback(res)(err, toSync);
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
            delete cahier.users;
            var fNew = false;
            if (cahier._id) {
                cahier._id = new db.ObjectID(cahier._id);
            }
            else {
                // Nouveau
                fNew = true;
                console.info("new");
                if (!cahier.created) {
                    cahier.created = new Date();
                }
                cahier.users = [{
                    id: user._id,
                    pseudo: user.pseudo,
                    owner: true
}];
                }
                cahier.tick = new Date();
                if (fNew) {
                    db.cahiers.save(cahier, { safe: true }, function(err, newCahier) {
                        if (err) console.error(err);
                        if (!newCahier) {
                            return dataCallback(res)("Problème d'enregistrement du cahier", newCahier);
                        }
                        if (!newCahier._id) {
                            console.info("update");
                            return dataCallback(res)(err, { tick: cahier.tick });
                        }
                        console.info("create");
                        dataCallback(res)(err, {
                            _id: newCahier._id.toString(),
                            users: cahier.users,
                            tick: cahier.tick
                        });
                    });

                }
                else {
                    db.cahiers.update({ _id: cahier._id }, {
                        $set: {
                            tick: cahier.tick,
                            created: cahier.created,
                            credentials: cahier.credentials,
                            email: cahier.email,
                            prenom: cahier.prenom,
                            photo: cahier.photo,
                            sexe: cahier.sexe || false,
                            infos: cahier.infos,
                            love: cahier.love,
                            hate: cahier.hate,
                            tel: cahier.tel,
                            allergies: cahier.allergies,
                            birth: cahier.birth
                        }
                    }, { upsert: true }, function(err, newCahier) {
                        if (err) console.error(err);
                        console.info("update");
                        return dataCallback(res)(err, { tick: cahier.tick });
                    });
                }
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
                db.cahiers.findOne({ _id: new db.ObjectID(req.body.cahier._id) }, function(err, cahier) {
                    if (err) console.error(err);
                    console.info("cahier");
                    if (!cahier) {
                        return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                    }
                    console.log(cahier);
                    var i = 0, l = cahier.users.length, found = false, owner = false, index = -1;
                    for (; i < l; i++) {
                        if (cahier.users[i].id.toString() == user._id.toString()) {
                            found = true;
                            index = i;
                            if (cahier.users[i].owner == true) {
                                owner = true;
                            }
                            break;
                        }
                    }
                    if (!found) {
                        console.info("not found");
                        return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                    }
                    if (owner) {
                        return db.cahiers.remove({ _id: new db.ObjectID(req.body.cahier._id) }, function(err, result) {
                            dataCallback(res)(err, result);
                        });
                    }
                    cahier.users.splice(index, 1);
                    cahier.tick = new Date();
                    db.cahiers.save(cahier, function(err, result) {
                        dataCallback(res)(err, result);
                    });
                });
            });
        },
        addUser: function(req, res) {
            checkUser(req.body.user._id, function(err, user) {
                if (!user) {
                    return dataCallback(res)("Problème d'authentification", user);
                }
                db.users.findOne({ email: req.body.email }, function(err, newUser) {
                    if (err) console.error(err);
                    else console.info("newUser trouvé");
                    console.log(newUser);
                    if (!newUser) {
                        return dataCallback(res)("Aucun utilisateur trouvé.", {});
                    }
                    db.cahiers.findOne({ _id: new db.ObjectID(req.body.cahier) }, function(err, cahier) {
                        if (err) console.error(err);
                        console.info("cahier");
                        if (!cahier) {
                            return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                        }
                        console.log(cahier);
                        var i = 0, l = cahier.users.length, found = false, newFound = false, owner = false, index = -1;
                        for (; i < l; i++) {

                            if (cahier.users[i].id.toString() == user._id.toString()) {
                                found = true;
                                index = i;
                                if (cahier.users[i].owner == true) {
                                    owner = true;
                                }
                            }
                            if (cahier.users[i].id.toString() == newUser._id.toString()) {
                                newFound = true;
                            }
                        }
                        if (!found) {
                            console.info("not found");
                            return dataCallback(res)("Le cahier pas trouvé.", {});
                        }
                        var cahierUser = {
                            id: newUser._id,
                            pseudo: newUser.pseudo,
                            owner: false
                        }

                        if (newFound) {
                            console.info("déjà présent");
                            return dataCallback(res)(err, {
                                user: null,
                                tick: cahier.tick
                            });
                        }
                        if (!owner) {
                            console.info("not owner");
                            return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                        }

                        cahier.users.push(cahierUser);
                        cahier.tick = new Date();
                        /*db.cahiers.save(cahier, function(err, result) {
                        dataCallback(res)(err, {
                        user: cahierUser,
                        tick: cahier.tick
                        });
                        });*/
                        db.cahiers.update({ _id: cahier._id }, {
                            $set: {
                                tick: cahier.tick,
                                users: cahier.users
                            }
                        }, { upsert: true }, function(err, newCahier) {
                            dataCallback(res)(err, {
                                user: cahierUser,
                                tick: cahier.tick
                            });
                        });
                    });
                });
            });
        },
        removeUser: function(req, res) {
            checkUser(req.body.user._id, function(err, user) {
                if (!user) {
                    return dataCallback(res)("Problème d'authentification", user);
                }
                db.cahiers.findOne({ _id: new db.ObjectID(req.body.cahier) }, function(err, cahier) {
                    if (err) console.error(err);
                    console.info("cahier");
                    if (!cahier) {
                        return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                    }
                    console.log(req.body.target);
                    var i = 0, l = cahier.users.length, found = false, owner = false, index = -1;
                    for (; i < l; i++) {
                        if (cahier.users[i].id.toString() == user._id.toString()) {
                            found = true;
                            if (cahier.users[i].owner == true) {
                                owner = true;
                            }
                        }
                        else {
                            if (cahier.users[i].id.toString() == req.body.target) {
                                index = i;
                            }
                        }
                    }
                    if (!found) {
                        console.info("not found");
                        return dataCallback(res)("Le cahier pas trouvé.", {});
                    }
                    if (!owner) {
                        console.info("not owner");
                        return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                    }
                    if (index == -1) {
                        console.info("user not found");
                        return dataCallback(res)("L'utilisateur a supprimer non trouvé.", {});
                    }
                    cahier.users.splice(1, index);
                    cahier.tick = new Date();
                    db.cahiers.save(cahier, function(err, result) {
                        dataCallback(res)(err, { tick: cahier.tick });
                    });
                });
            });
        }
    };

exports.routes = routes;