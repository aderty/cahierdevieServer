var gcm = require('node-gcm');
var apn = require('apn');

//API Server Key
var gcmSender = new gcm.Sender('AIzaSyAfOFjQDLotJc3IDvLCJmOJ_scltjAQWtQ');
var notify = {
    pushEvent: function (cahier, event, message, ids) {
        var registrationIds = [];
        var gcmMessage = new gcm.Message();
        // Value the payload data to send...
        gcmMessage.addData('message', message);//"\u270C Nouvel &eacute;v&egrave;nement \u2706!");
        gcmMessage.addData('title', 'Cahier de vie');
        gcmMessage.addData('msgcnt', event.events.length); // Shows up in the notification in the status bar
        gcmMessage.addData('soundname', 'beep.wav'); //Sound to play upon notification receipt - put in the www folder in app
        gcmMessage.addData('cahier', cahier.id);
        gcmMessage.addData('date', event.date);
        //message.collapseKey = 'demo';
        //message.delayWhileIdle = true; //Default is false
        gcmMessage.timeToLive = 900000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
        console.log(ids);
        console.log(message);
        console.log("cahier id : " + cahier.id);
        console.log("cahier date : " + event.date);
        // At least one reg id required
       // registrationIds.push('APA91bGTIWVKhrENCjzTW25Ai7WRLkuDQKDtzxcXNiHaTwRZflm_jgkqHjmO9JQKnNg1I_JPIx1Oyh0Y5c3SSKBLsnPdMEmmFjSb9kjzOHQOsOKdOskf8DZajnbBkhQBwxvP0ItWFor4');

        /**
         * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
         */
        gcmSender.send(gcmMessage, ids.gcm, 3, function (result) {
            console.log(result);
        });

        if (!ids.apn || !ids.apn.length) return;

        var callback = function (errorNum, notification) {
            console.log('Error is: %s', errorNum);
            console.log("Note " + notification);
        }
        var options = {
            gateway: 'gateway.sandbox.push.apple.com', // this URL is different for Apple's Production Servers and changes when you go to production
            errorCallback: callback,
            cert: './key/CahierDeVieCert.pem',
            key: './key/CahierDeVieKey.pem',
            passphrase: 'infomil2013',
            port: 2195,
            enhanced: true,
            cacheLength: 100
        }
        var apnsConnection = new apn.Connection(options);

        var myDevice;

        var note = new apn.Notification();
        note.badge = 1;
        note.sound = "notification-beep.wav";
        note.alert = { "body": message, "action-loc-key": "Play", "launch-image": "img/icon.png" };
        note.payload = { 'cahier': cahier.id,  'date': event.date };

        ids.apn.forEach(function (iDevice) {
            myDevice = new apn.Device(iDevice);
            note.device = myDevice;
            apnsConnection.sendNotification(note);
        })     
    }
}

exports.notify = notify;