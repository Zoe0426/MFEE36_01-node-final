const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    const [data] = await db.query("SELECT * FROM address_book LIMIT 2");
    res.json(data)
})

module.exports = router;