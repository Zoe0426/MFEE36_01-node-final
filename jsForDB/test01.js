const fs = require('fs');

const directoryPath = __dirname +'/';
//passsing directoryPath and callback function
fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log(file); 
        if(file=='m1 (1).jpg'){
            fs.rename(__dirname +'/m1 (1).jpg', __dirname +'/m1_1.jpg', e=>{})
        }

        if(file.indexOf('m1 (')===0){
            let n = file.split('m1 (')[1].split(').jpg')[0];
            fs.rename(__dirname +'/' + file, __dirname +'/m1_'+n+'.jpg', e=>{})
        }
    });
});