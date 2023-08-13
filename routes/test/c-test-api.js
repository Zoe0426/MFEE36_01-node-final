const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../../modules/db_connect");
const upload = require(__dirname+"/../../modules/img-upload.js");
const multipartParser = upload.none(); 

//======測試日期轉換functions======
router.get ('/', async(req,res)=>{
    const [data] = await db.query("SELECT * FROM address_book LIMIT 2");
    console.log(data);

    data.forEach(i=>{
        //轉換日期格式的functions
        i.birthday = res.toDateString(i.birthday)
        i.created_at = res.toDatetimeString(i.created_at)
    
    });
    res.json(data)
})

//======測試照片上傳（單張/多張）======
//測試檔案public/test-uploadImgs.html,用liveServer開來測試
router.post('/img-upload', upload.single('photo'), (req,res)=>{
    //console.log(req.file);
    res.json(req.file);
})
router.post('/img-uploads', upload.array('photos', 10),(req,res)=>{
    //console.log(req.files);
    res.json(req.files);
})


router.get ('/test', async(req,res)=>{
    const sql = ''
    const [data] = await db.query(sql);
    
    //console.log(data);
    res.json(data)
})




module.exports = router;

//--常用code--
// try {
    // const ..Sql = `` 
    // const [..Result] = await db.query(..Sql, []);
    // return ..Result.affectedRows? 'success' : 'failed';
// } catch(error) { console.error(error);
    // throw new Error('');
// }