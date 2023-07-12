const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    const [data] = await db.query("SELECT * FROM `post_list_member` WHERE 1 LIMIT 2");
    res.json(data)
    //阿鄉到此一遊
})
router.get ('/:postSid', async(req,res)=>{
    const [data] = await db.query("SELECT * FROM `post_list_member` WHERE 1 LIMIT 2");
    res.json(data)
    //阿鄉到此一遊
})

module.exports = router;