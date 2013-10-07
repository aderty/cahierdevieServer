var fs = require('fs'),
    async = require('async'),
    config = require('./config.json'),
    mail = require('./mail');

var uploadsFolder = __dirname + '/uploads'; 
var init = false; 
// Create the "tmp" folder if it doesn't exist 
createFolder(__dirname + '/tmp'); 
// Create the "uploads" folder if it doesn't exist 
createFolder(uploadsFolder, function() { 
    init = true; 
    exports.startListening(); 
}); 

function createFolder(folder, callback) { 
    fs.exists(folder, function(exists) { 
        if (!exists) { 
            console.log('Creating directory ' + folder); 
            fs.mkdir(folder, function(err) { 
                if (err) { 
                    console.log('Error creating ' + folder); 
                    return process.exit(1); 
                } 
                callback(); 
            }) 
        } 
        else { 
            callback(); 
        } 
    }); 
} 

exports.addCahier = function(req, res, next) { 

    console.log("upload cahier"); 

    var file = req.files.file, 
        filePath = file.path, 
        fileName = file.name, 
        lastIndex = filePath.lastIndexOf("/"), 
        //tmpFileName = filePath.substr(lastIndex + 1), 
        //image = req.body, 
        id = req.params.id; 

    fs.exists(uploadsFolder + '/' + id, function(exists) { 
        if (!exists) { 
            fs.mkdir(uploadsFolder + '/' + id, function(err) { 
                if (err) { 
                    console.log('Error creating ' + uploadsFolder + '/' + +id); 
                    res.write("ko");
                    res.end();
                } 
                copyFile(filePath, uploadsFolder + "/" + id + "/" + fileName); 
                res.write("ok");
                res.end();
            }); 
        } 
        else { 
            copyFile(filePath, uploadsFolder + "/" + id + "/" + fileName); 
            res.write("ok");
            res.end();
        } 
    });
    
}; 

exports.addImage = function (req, res, next) { 

    console.log("upload picture"); 

    var file = req.files.file, 
        filePath = file.path, 
        fileName = file.name, 
        lastIndex = filePath.lastIndexOf("/"), 
        //tmpFileName = filePath.substr(lastIndex + 1), 
        //image = req.body, 
        id = req.params.id; 
        
    copyFile(filePath, uploadsFolder + "/" + id + "/" + fileName); 

    res.write("ok"); 
    res.end(); 
}; 

function copyFile(from, to) { 
    fs.readFile(from, function(err, data) { 
        if (err) throw err; 
        fs.writeFile(to, data, function(err) { 
            if (err) throw err; 
            fs.unlink(from, function(err) { 
                if (err) throw err; 
            }); 
        }); 
    }); 
}

var pendings = {};
exports.startListening = function() { 
    if (!init) ; 
    console.log("startListening"); 
    fs.watch(uploadsFolder, function (event, filename) {
        if (filename) {
            var file = uploadsFolder + "/" + filename + "/" + filename + ".json"; 
            fs.readFile(file, function(err, data) { 
                if (err) return console.log("Fichier json non disponible."); // Fichier de description non trouvé 
                try { 
                    var cahier = JSON.parse(data); 
                } catch (e) { 
                    console.log("Problème de parsing du Json : " + data); 
                }
                if (pendings[cahier.id]) clearTimeout(pendings[cahier.id]);

                pendings[cahier.id] = setTimeout((function (info, file) {
                    return function () {
                        var nbPictures = info.nbPictures;
                        
                        var folder = uploadsFolder + "/" + file + "/";
                        fs.readdir(folder, function (err, list) {
                            if (err) return console.log("Problème lors de la lecture du rep " + file + err);
                            var pending = list.length;
                            // Les photos sont présentes -> Envois du mail 
                            if (pending > nbPictures) return sendMail(info.email, info, folder, list);
                        });
                    }
                })(cahier, filename), 2000);
            }); 
        } 
    }); 
} 

function sendMail(email, cahier, dossier, list) { 
    console.log("Envois du mail à " + email);
    var i = 0, l = list.length;
    for (; i < l; i++) {
        list[i] = dossier + list[i];
    }
    i = 0;
    async.forEach(list, function (item, callback) {   
        if (i > 0) {
            console.log("transform " + item);
            return transformPicture(item, function (err, data) {
                if (err) callback();
                list[i++] = data;
                callback();
            });
        }
        i = 1;
        callback();
        // results is now an array of stats for each file
    }, function (err) {
        var index = 1;
        i = 0, l = cahier.events.length;
        for (; i < l; i++) {
            var j = 0, k = cahier.events[i].pictures.length;
            for (; j < k; j++) {
                cahier.events[i].pictures[j] = list[index++];
            }
        }
        
        mail.send(email, cahier, dossier, list, function (err) {
            if (err) console.log(err);
            async.forEach(list, function (item, callback) {
                fs.unlink(item, callback);
                // results is now an array of stats for each file
            }, function (err) {
                fs.rmdir(dossier, function (err) {
                    if (err) console.log(err);
                })
            });
        });
    });   
} 

var data_uri_prefix = "data:image/png;base64,"; 

function transformPicture(picture, callback) { 
    data = fs.readFileSync(picture, "utf8");
    if (!data) callback("Fichier de description non trouvé"); // Fichier de description non trouvé 
    try {
        var buf = new Buffer(data);
        var image = buf.toString('base64');
        image = data_uri_prefix + image;
        callback(null, image);
    } catch (e) {
        console.log("Problème de de la convertion en base64 de l'image " + picture);
        callback("Problème de de la convertion en base64 de l'image " + picture);
    }
    /*fs.readFile(picture, function(err, data) { 
        if (err) callback(err); // Fichier de description non trouvé 
        try { 
            var buf = new Buffer(data);
            var image = buf.toString('base64');
            image = data_uri_prefix + image; 
            callback(null, image); 
        } catch (e) { 
            console.log("Problème de de la convertion en base64 de l'image " + picture); 
            callback("Problème de de la convertion en base64 de l'image " + picture);
        } 
    }); */
} 

/* 
function get_image_size_from_URI(imageURI) { 
    // This function is called once an imageURI is rerturned from PhoneGap's camera or gallery function 
    window.resolveLocalFileSystemURI(imageURI, function(fileEntry) { 
        fileEntry.file(function(fileObject){ 
            // Create a reader to read the file 
            var reader = new FileReader() 

            // Create a function to process the file once it's read 
            reader.onloadend = function(evt) { 
                // Create an image element that we will load the data into 
                var image = new Image() 
                image.onload = function(evt) { 
                    // The image has been loaded and the data is ready 
                    var image_width = this.width 
                    var image_height = this.height 
                    console.log("IMAGE HEIGHT: " + image_height) 
                    console.log("IMAGE HEIGHT: " + image_width) 
                    // We don't need the image element anymore. Get rid of it. 
                    image = null 
                } 
                // Load the read data into the image source. It's base64 data 
                image.src = evt.target.result 
            } 
            // Read from disk the data as base64 
            reader.readAsDataURL(fileObject) 
        }, function(){ 
            console.log("There was an error reading or processing this file.") 
        }) 
    }) 
} 
*/ 
