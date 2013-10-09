var fs = require('fs'),
    //async = require('async'),
    config = require('./config.json'),
    mail = require('./mail');

/*var uploadsFolder = __dirname + '/uploads'; 
var init = false; 
// Create the "tmp" folder if it doesn't exist 
createFolder(__dirname + '/tmp'); 
// Create the "uploads" folder if it doesn't exist 
createFolder(uploadsFolder, function() { 
    init = true; 
    exports.startListening(); 
}); */

var pendingsCahier = {};

exports.addCahier = function(req, res, next) {

    console.log("upload cahier");

    var file = req.files.file,
        filePath = file.path,
        fileName = file.name,
        lastIndex = filePath.lastIndexOf("/"),
        id = req.params.id;

    fs.readFile(filePath, function(err, data) {
        if (err) {
            console.log(err);
            res.write("ko");
            res.end();
            return;
        }
        fs.unlink(filePath, function(err) {
            if (err) throw err;
        });
        var cahier = null;
        try {
            cahier = JSON.parse(data);
        }
        catch (e) {
            console.log(e);
        }
        if (!cahier || !id) {
            res.write("ko");
            res.end();
            return;
        }
        cahier.uid = id;
        cahier.nbFichierReceived = 0;
        cahier.medias = [];
        pendingsCahier[id] = cahier;

        pendingsCahier[id].sending = setTimeout((function(id) {
            return function() {
                pendingsCahier[id].sent = true;
                // Envois du mail au bout de 3 min si les médias ne sont pas encore arrivés.
                sendMail(pendingsCahier[id].email, pendingsCahier[id]);
            }
        })(id), 180000);

        res.write("ok");
        res.end();
    });

};

exports.addImage = function(req, res, next) {

    console.log("upload picture");

    var file = req.files.file,
        filePath = file.path,
        fileName = file.name,
        lastIndex = filePath.lastIndexOf("/"),
        id = req.params.id;

    if (!id || !pendingsCahier[id]) {
        res.write("ko");
        res.end();
        return;
    }

    pendingsCahier[id].nbFichierReceived = pendingsCahier[id].nbFichierReceived + 1;

    transformPicture(filePath, function(err, data) {
        if (err) {
            console.log(err);
            return;
        }

        var cid = fileName + "@cahierdevie";
        pendingsCahier[id].medias.push({
            filename: fileName,
            contents: data,
            cid: cid
        });

        fs.unlink(filePath, function(err) {
            if (err) throw err;
        });
        var i = 0, l = pendingsCahier[id].events.length;
        for (; i < l; i++) {
            if (!pendingsCahier[id].events[i].transform) {
                pendingsCahier[id].events[i].transform = [];
            }
            var j = 0, k = pendingsCahier[id].events[i].pictures.length;
            for (; j < k; j++) {
                if (pendingsCahier[id].events[i].transform.indexOf(j) == -1 && pendingsCahier[id].events[i].pictures[j].indexOf(fileName) > -1) {
                    pendingsCahier[id].events[i].pictures[j] = "cid:" + cid;
                    pendingsCahier[id].events[i].transform.push(j);
                }
            }
        }
        if (pendingsCahier[id].nbFichierReceived < pendingsCahier[id].nbPictures || pendingsCahier[cahier.id].sent) {
            return;
        }

        if (pendingsCahier[id].sending) clearTimeout(pendingsCahier[id].sending);

        pendingsCahier[id].sending = setTimeout((function(cahier) {
            return function() {
                pendingsCahier[cahier.id].sent = true;
                // Les photos sont présentes -> Envois du mail
                sendMail(cahier.email, cahier);
            }
        })(pendingsCahier[id]), 2000);
    });
    res.write("ok");
    res.end();

}; 

function copyFile(from, to, callback) { 
    fs.readFile(from, function(err, data) { 
        if (err) throw err; 
        fs.writeFile(to, data, function(err) { 
            if (err) throw err; 
            fs.unlink(from, function(err) { 
                if (err) throw err; 
            }); 
        });
    });

    var ins = fs.createReadStream(from),
    ous = fs.createWriteStream(to);
    
    util.pump(ins, ous, function(err) {
        callback(err);
    });
}

function sendMail(email, cahier) {
    console.log("Envois du mail à " + email);

    mail.send(email, cahier, null, null, function(err) {
        if (err) console.log(err);
        delete pendingsCahier[cahier.uid];
    });
}

var data_uri_prefix = "data:image/jpg;base64,"; 

function transformPicture(picture, callback) { 
    data = fs.readFileSync(picture);
    if (!data) callback("Fichier de description non trouvé"); // Fichier de description non trouvé 
    try {
        var buf = new Buffer(data, 'binary');
        var image = buf.toString('base64');
        //image = data_uri_prefix + image;
        callback(null, image);
    } catch (e) {
        console.log("Problème de de la convertion en base64 de l'image " + picture);
        callback("Problème de de la convertion en base64 de l'image " + picture);
    }
} 
