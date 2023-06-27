const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    const sql = "SELECT * FROM `restaurant_information` LIMIT 2";
    const [data] = await db.query(sql);
    res.json(data)
})
//測試
module.exports = router;
console.log(JSON.stringify(router, null, 4));