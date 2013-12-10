var fs = require('fs'),
    //async = require('async'),
    config = require('./config.json'),
    mail = require('./mail');

// Libraries
var Dropbox = require('dropbox');

var DROPBOX_APP_KEY = config.dropbox.app_key;
var DROPBOX_APP_SECRET = "km0h5iepbirptvu";
var STATE = "oas_horr67r1_0.8itz2dnwm8e0cnmi";
var TOKEN = config.dropbox.token;
var UID = config.dropbox.uid;

var dropbox = new Dropbox.Client({
    key: DROPBOX_APP_KEY,
    secret: DROPBOX_APP_SECRET,
    sandbox: false,
    token: TOKEN,
    uid: UID
});

exports.save = function (name, data, fn) {
    dropbox.writeFile(name, data, function (err, data) {
        if (err) return console.error(err);
        if (fn) fn(err, data);
        // Move it into the Public directory.
        /*dropbox.move('foo.txt', 'Public/foo.txt', function (err, data) {
            if (err) return console.error(err)

            // Delete the file.
            dropbox.remove('Public/foo.txt', function (err, data) {
                if (err) console.error(err.stack)
                console.log("ok");
            })
        })*/
    });
}
exports.url = function (name, fn) {
     dropbox.makeUrl(name, { download: true }, function (err, data) {
            if (err) return console.error(err)
            if (fn) fn(err, data.url);
     });
}





//{"access_token": "TBq6qEVcIQEAAAAAAAAAAaLvoHrXni7Q6ST4jjKOKII5fwLRSuE1cPOEjem3ce9Y", "token_type": "bearer", "uid": "242955592"}

// http://www.johanbleuzen.fr/blog/uploader-fichiers-dropbox-node-js

// On s'authentifie via l'API développeur
/*var dropbox = new Dropbox.Client({
    key: DROPBOX_APP_KEY, secret: DROPBOX_APP_SECRET, sandbox: false//, oauthCode: THE_TOKEN_SECRET, oauthStateParam: THE_TOKEN
});
dropbox.authDriver(new Dropbox.AuthDriver.NodeServer(8191));
dropbox.authenticate(function (error, client) {
    console.log('connected...');
    console.log('token ', client.oauth.token);       // THE_TOKEN
    console.log('secret ', client.oauth.tokenSecret); // THE_TOKEN_SECRET
});

//https://www.dropbox.com/1/oauth2/authorize?response_type=code&redirect_uri=http://localhost:8912/oauth_callback&client_id=e42anle8lkz6hww&state=oas_horr67r1_0.8itz2dnwm8e0cnmi
$.ajax({ url: "https://api.dropbox.com/1/oauth2/token", type: 'POST', data: { grant_type: 'authorization_code', code: 'ooZ8B8yGs6MAAAAAAAAAAbGMn_95-0INMXbBIRcxJyc', redirect_uri: 'http://localhost:8912/oauth_callback', client_id: 'e42anle8lkz6hww', client_secret: 'km0h5iepbirptvu' } })
*/
// On s'authentifie avec son compte Dropbox
/*dropbox.getAccessToken("moncahierdevie1@gmail.com", "infomil2013", function (err, token, secret) {
    console.log(err);
    console.log(token);
    console.log(secret);
    // Upload de l'archive dans le répertoire sauvegarde.
    dropbox.putFile('fichiers_importants.zip', 'sauvegarde', function (err, data) {
        if (err) return console.error(err)
    })
})*/
