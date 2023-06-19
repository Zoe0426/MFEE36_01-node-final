const multer = require('multer');
const {v4: uuidv4} = require('uuid'); //產生亂數檔名

//上傳檔案類型
const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/fig': '.gif'
}
//上傳檔案存放位置
const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null, __dirname + '/../public/img')
    },
    filename: (req, file, cb)=>{
        let ext = extMap[file.mimetype];
        cb(null, uuidv4()+ext);
    }
})
//過濾檔案類型
const fileFilter = (req,file,cb)=>{
    cb (null, !!extMap[file.mimetype]);
}

module.exports = multer({fileFilter, storage})