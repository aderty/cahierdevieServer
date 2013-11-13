var fs = require('fs'),
    nodemailer = require('nodemailer'),
    _ = require('underscore'),
    config = require('./config.json'),
    mails = require('./mails.json'),
    db = require("./db");

var mailsIndex = 0;

function extend(dest, from) {
    var props = Object.getOwnPropertyNames(from), destination;

    props.forEach(function (name) {
        if (typeof from[name] === 'object') {
            if (typeof dest[name] !== 'object') {
                dest[name] = {}
            }
            extend(dest[name], from[name]);
        } else {
            destination = Object.getOwnPropertyDescriptor(from, name);
            Object.defineProperty(dest, name, destination);
        }
    });
    return dest;
}
/*var options = extend({
    //service: "Gmail",
}, config.mail);*/

function nextMail() {
    var mail = mails[mailsIndex];
    if (mailsIndex == mails.length - 1) {
        mailsIndex = 0;
    }
    else {
        mailsIndex = mailsIndex + 1;
    }
    return mail;
}

// create reusable transport method (opens pool of SMTP connections)
//var smtpTransport = nodemailer.createTransport("SMTP", options);
var templatePath = "./emails/first.html",
templateContent = fs.readFileSync(templatePath, "utf8");
var emailTemplate = {};

db.events.once('connected', function() {
    console.log("connected to db");
    db.emails.find({ id: "1" }).toArray(function (err, res) {
        if (res) {
            if (res.length) {
                console.log("template récupéré");
                emailTemplate = res[0];
                templateContent = res[0].html;
            }
            else {
                console.log("Aucun template disponible");
            }
        }
    });
});


var i = 0, l = mails.length;
for (; i < l; i++) {
    mails[i] = nodemailer.createTransport("SMTP", mails[i]);
}
exports.updateEmail = function(req, res, next) {

    console.log("update email");

    var id = req.body.id;

    if (!id) return;
    emailTemplate.id = id;
    emailTemplate.html = req.body.template;
    templateContent = emailTemplate.html;
    //emailTemplate.html.replace(/\"/gi, "\\\"").replace(/(\r\n|\n|\r)/gm, " ");
    db.emails.save(emailTemplate, function(err, save) {
        if (err) throw err;
        if (typeof save == "object") {
            emailTemplate = save;
        }
        console.log("email modifié");
    });
    res.write("ok");
    res.end();
}

exports.send = function(email, data, dossier, list, callback) {
    console.log("Génération du mail...");
    try {
        var html = _.template(templateContent, data); //, { interpolate: /\{\{(.+?)\}\}/g });
    }
    catch (e) {
        console.log(e);
        callback(e);
        return;
    }
    console.log("Mail généré");
    
    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: config.mail.defaultFromAddress, //"footmap@laposte.net", // sender address
        to: email, // list of receivers
        subject: "Cahier de vie", // Subject line
        text: "Cahier de vie",
        html: html // html body
    }
    if (data.medias.length > 0) {
        mailOptions.attachments = data.medias;
    }
    /*
    var mailOptions = {   
    from: config.mail.defaultFromAddress, //"footmap@laposte.net", // sender address
    to: email, // list of receivers
    subject: "Cahier de vie", // Subject line
    html: html, // html body
    attachments: [  
    {   
    filename: "somepicture.jpg",    
    contents: new Buffer(data, 'base64'),   
    cid: "logo@myapp"    
    }   
    ]   
    };
    // <img src="cid:logo@myapp" />
    // Make sure you set Content-Type: multipart/mixed; , boundary and Content-Transfer-Encoding: base64
    */

    /*var to = __dirname + '/tmp/toto.html';
    fs.writeFile(to, html, function (err) {
    });*/

    // send mail with defined transport object
    nextMail().sendMail(mailOptions, function (error, response) {
        if (error) {
            callback(error);
        } else {
            console.log("Message sent: " + response.message);
            callback(null, response.message);
        }
        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });
}
