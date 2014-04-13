var fs = require('fs'),
    _ = require('underscore'),
    config = require('./config.json'),
    db = require("./db"),
    notify = require("./notify").notify;
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
            email: user.email.toLowerCase(),
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
                user.created = new Date();
                user.updated = user.created;
                db.users.insert(user, { safe: true }, function(err, newUser) {
                    newUser = newUser[0];
                    var dbCahiers = db.cahiers.find({ users: { $elemMatch: { pseudo: newUser.email.toLowerCase()} }});
                    dbCahiers.toArray(function(err, cahiers) {
                        if (err) console.error(err);
                        else console.log("cahiers array trouvé " + cahiers.length);
                        var i = 0, l = cahiers.length, toSync = [], toSave = false;
                        for (; i < l; i++) {
                            var j = 0, m = cahiers[i].users.length, currentUser;
                            cahiers[i].users.forEach(function(currentUser, index) {
                                if (currentUser.pseudo  != newUser.email.toLowerCase()) return;
                                console.log("user trouvé");
                                cahiers[i].users[index] = {
                                    id: newUser._id,
                                    pseudo: newUser.pseudo,
                                    email: newUser.email,
                                    pushIds: newUser.pushIds,
                                    state: 2,
                                    owner: false
                                };
                            });
                            console.log("sauvegarde cahier " + cahiers[i].users);
                            cahiers[i].tick = new Date();
                            db.cahiers.update({ _id: cahiers[i]._id }, {
                                $set: {
                                    tick: cahiers[i].tick,
                                    users: cahiers[i].users
                                }
                            }, { upsert: true }, function(err) { });
                        }
                    });
                    dataCallback(res)(err, newUser);
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
        checkUser(user._id, function(err, last_user) {
            if (!last_user) {
                return dataCallback(res)("Problème d'authentification", user);
            }
            console.log("Modification");
            console.log(user);
            if (user.email != last_user.email) {
                db.users.findOne({ email: user.email }, function(err, save) {
                    if (err) console.error(err);
                    if (!save) {
                        toExec();
                    }
                    else {
                        dataCallback(res)("Email déjà utilisé", save);
                    }
                });
            }
            else {
                toExec();
            }
            function toExec() {
                var pwd = user.pwd;
                // Chiffrage du pass en sha1
                var hash = crypto.createHash('sha1').update(pwd).digest("hex");
                user.pwd = hash;
                db.users.update({ _id: new db.ObjectID(user._id) }, {
                    $set: {
                        updated: new Date(),
                        email: user.email.toLowerCase(),
                        pseudo: user.pseudo,
                        pwd: user.pwd
                    }
                }, { upsert: true }, function(err, save) {
                    if (err) console.error(err);
                    else console.log("user modifié");
                    if (typeof save == "object") {
                    }

                    var dbCahiers = db.cahiers.find({ users: { $elemMatch: { id: last_user._id}} });
                    dbCahiers.toArray(function(err, cahiers) {
                        if (err) console.error(err);
                        else console.log("cahiers array trouvé " + cahiers.length);
                        var i = 0, l = cahiers.length, toSync = [], toSave = false;
                        for (; i < l; i++) {
                            var j = 0, m = cahiers[i].users.length, currentUser;
                            cahiers[i].users.forEach(function(currentUser, index) {
                                if (currentUser.id  != user._id) return;
                                console.log("user trouvé");
                                cahiers[i].users[index].pseudo = user.pseudo;
                                cahiers[i].users[index].email = user.email.toLowerCase();
                            });
                            console.log("sauvegarde cahier " + cahiers[i].users);
                            cahiers[i].tick = new Date();
                            db.cahiers.update({ _id: cahiers[i]._id }, {
                                $set: {
                                    tick: cahiers[i].tick,
                                    users: cahiers[i].users
                                }
                            }, { upsert: true }, function(err) { });
                        }
                    });

                    dataCallback(res)(err, user);
                });
            }
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
                        cahiers[i].users.forEach(function(cUser) {
                            delete cUser.pushIds;
                        });
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
                db.users.findOne({ email: req.body.email.toLowerCase() }, function(err, newUser) {
                    if (err) console.error(err);
                    else console.info("newUser trouvé");
                    console.log(newUser);
                    /*if (!newUser) {
                        return dataCallback(res)("Aucun utilisateur trouvé.", {});
                    }*/
                    db.cahiers.findOne({ _id: new db.ObjectID(req.body.cahier) }, function(err, cahier) {
                        if (err) console.error(err);
                        console.info("cahier");
                        if (!cahier) {
                            return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                        }
                        console.log(cahier);
                        var i = 0, l = cahier.users.length, found = false, newFound = false, owner = false, index = -1;
                        for (; i < l; i++) {

                            if (cahier.users[i].id && cahier.users[i].id.toString() == user._id.toString()) {
                                found = true;
                                index = i;
                                if (cahier.users[i].owner == true) {
                                    owner = true;
                                }
                            }
                            if (newUser) {
                                if(cahier.users[i].id.toString() == newUser._id.toString()){
                                    newFound = true;
                                }
                            }
                            else{
                                if(cahier.users[i].pseudo == req.body.email.toLowerCase()){
                                    newFound = true;
                                }
                            }
                        }
                        if (!owner) {
                            console.info("not owner");
                            return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                        }
                        if (!found) {
                            console.info("not found");
                            return dataCallback(res)("Le cahier pas trouvé.", {});
                        }
                        var cahierUser = newUser ? {
                            id: newUser._id,
                            pseudo: newUser.pseudo,
                            email: newUser.email,
                            pushIds: newUser.pushIds,
                            state: 2,
                            owner: false
                        } : {
                            pseudo: req.body.email.toLowerCase(),
                            email: req.body.email.toLowerCase(),
                            state: 1
                        };

                        if (newFound) {
                            console.info("déjà présent");
                            return dataCallback(res)(err, {
                                user: null,
                                tick: cahier.tick
                            });
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
                            delete cahierUser.pushIds;
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
                        if (cahier.users[i].id && cahier.users[i].id.toString() == user._id.toString()) {
                            found = true;
                            if (cahier.users[i].owner == true) {
                                owner = true;
                            }
                        }
                        else {
                            if (cahier.users[i].id && cahier.users[i].id.toString() == req.body.target) {
                                index = i;
                            }
                            else{
                                if (cahier.users[i].pseudo && cahier.users[i].pseudo == req.body.target) {
                                    index = i;
                                }
                            }
                        }
                    }
                    if (!owner) {
                        console.info("not owner");
                        return dataCallback(res)("Le cahier ne vous appartient pas.", {});
                    }
                    if (!found) {
                        console.info("not found");
                        return dataCallback(res)("Le cahier pas trouvé.", {});
                    }
                    if (index == -1) {
                        console.info("user not found");
                        return dataCallback(res)("L'utilisateur a supprimer non trouvé.", {});
                    }
                    cahier.users[index].state = 0;
                    cahier.tick = new Date();
                    db.cahiers.update({ _id: cahier._id }, {
                            $set: {
                                tick: cahier.tick,
                                users: cahier.users
                            }
                        }, { upsert: true }, function(err, newCahier) {
                            delete cahierUser.pushIds;
                            dataCallback(res)(err, {
                                users: cahier.users,
                                tick: cahier.tick
                            });
                    });
                    /*cahier.users.splice(1, index);
                    cahier.tick = new Date();
                    db.cahiers.save(cahier, function(err, result) {
                        dataCallback(res)(err, { tick: cahier.tick });
                    });*/
                });
            });
        },
        addPushId: function(req, res) {
            checkUser(req.body.user._id, function(err, user) {
                if (!user) {
                    return dataCallback(res)("Problème d'authentification", user);
                }
                var toSave = false;
                if (!user.pushIds) {
                    user.pushIds = {
                        gcm: [],
                        apn: []
                    }
                }
                if (user.pushIds[req.body.push.type] && user.pushIds[req.body.push.type].indexOf(req.body.push.id) == -1) {
                    user.pushIds[req.body.push.type].push(req.body.push.id);
                    toSave = true;
                }
                if (!toSave) {
                    return dataCallback(res)(err, { result: true });
                }
                console.log("sauvegarde user " + user.pushIds.gcm);
                db.users.update({ _id: user._id }, {
                    $set: {
                        updated: new Date(),
                        pushIds: user.pushIds
                    }
                }, { upsert: true }, function(err) {
                    if (err) console.error(err);
                    else console.log("user modifié");
                    //console.log(req.body.user._id);
                    //console.log("addPushId : " + req.body.push.id + " , type : " + req.body.push.type);
                    var dbCahiers = db.cahiers.find({ users: { $elemMatch: { id: user._id}} });
                    dbCahiers.toArray(function(err, cahiers) {
                        if (err) console.error(err);
                        else console.log("cahiers array trouvé " + cahiers.length);
                        var i = 0, l = cahiers.length, toSync = [], toSave = false;
                        for (; i < l; i++) {
                            var j = 0, m = cahiers[i].users.length, currentUser;
                            cahiers[i].users.forEach(function(currentUser) {
                                if (currentUser.id != user._id.toString()) return;
                                console.log("user trouvé");
                                currentUser.pushIds = user.pushIds;
                            });
                            console.log("sauvegarde cahier " + cahiers[i].users);
                            cahiers[i].tick = new Date();
                            db.cahiers.update({ _id: cahiers[i]._id }, {
                                $set: {
                                    tick: cahiers[i].tick,
                                    users: cahiers[i].users
                                }
                            }, { upsert: true }, function(err) { });
                        }
                        dataCallback(res)(err, { result: true });
                    });
                });
            });
        },
        pushEvent: function(req, res) {
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
                    var ids = {
                        gcm: [],
                        apn: []
                    }
                    cahier.users.forEach(function(currentUser){
                        if (currentUser.id == user._id.toString() || !currentUser.pushIds) return;
                        console.log(currentUser.pushIds);
                        ids.gcm = Array.prototype.concat(ids.gcm, currentUser.pushIds.gcm);
                        ids.apn = Array.prototype.concat(ids.apn, currentUser.pushIds.apn);
                    });
                    if(ids.gcm.length || ids.apn.length){
                        notify.pushEvent(cahier, req.body.event, cahier.prenom + " : Nouvel évènement disponible !", ids);
                    }
                    dataCallback(res)(err, { result: true });
                });
            });
        }
    };

exports.routes = routes;