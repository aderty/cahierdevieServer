var fs = require('fs'),
    nodemailer = require('nodemailer'),
    _ = require('underscore'),
    config = require('./config.json');

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
var options = extend({
    //service: "Gmail",
}, config.mail);

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP", options);

exports.send = function (email, cahier, dossier, list, callback) {
    var templatePath = "./emails/first.html",
    templateContent = fs.readFileSync(templatePath);
    var data = cahier;
    console.log("Génération du mail...");
    var html = _.template(templateContent, data);//, { interpolate: /\{\{(.+?)\}\}/g });
    console.log("Mail généré");
    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: config.mail.defaultFromAddress, //"footmap@laposte.net", // sender address
        to: email, // list of receivers
        subject: "Cahier de vie", // Subject line
        html: html // html body
    }

    /*var to = __dirname + '/tmp/toto.html';
    fs.writeFile(to, html, function (err) {
    });*/

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function (error, response) {
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