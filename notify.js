var gcm = require('node-gcm');

//API Server Key
var gcmSender = new gcm.Sender('AIzaSyAfOFjQDLotJc3IDvLCJmOJ_scltjAQWtQ');
var notify = {
    pushEvent: function (message, ids) {
        var registrationIds = [];
        var gcmMessage = new gcm.Message();
        // Value the payload data to send...
        gcmMessage.addData('message', message);//"\u270C Nouvel &eacute;v&egrave;nement \u2706!");
        gcmMessage.addData('title', 'Cahier de vie');
        gcmMessage.addData('msgcnt', '3'); // Shows up in the notification in the status bar
        gcmMessage.addData('soundname', 'beep.wav'); //Sound to play upon notification receipt - put in the www folder in app
        //message.collapseKey = 'demo';
        //message.delayWhileIdle = true; //Default is false
        gcmMessage.timeToLive = 900000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
        console.log(ids);
        // At least one reg id required
       // registrationIds.push('APA91bGTIWVKhrENCjzTW25Ai7WRLkuDQKDtzxcXNiHaTwRZflm_jgkqHjmO9JQKnNg1I_JPIx1Oyh0Y5c3SSKBLsnPdMEmmFjSb9kjzOHQOsOKdOskf8DZajnbBkhQBwxvP0ItWFor4');

        /**
         * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
         */
        gcmSender.send(gcmMessage, ids.gcm, 3, function (result) {
            console.log(result);
        });
    }
}


exports.notify = notify;