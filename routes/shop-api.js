const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    const sql=`SELECT p.*, MAX(ps.proDet_price) max_price, MIN(ps.proDet_price) min_price
    FROM shop_pro p
    JOIN shop_proDet ps ON p.pro_sid=ps.pro_sid
    GROUP BY p.pro_sid
    LIMIT 1, 5`
    const [result]=await db.query(sql)
    res.json({result})
    // data.forEach(i=>{
    //     i.birthday = res.toDatetimeString(i.birthday)
    //     i.created_at = res.toDatetimeString(i.created_at)
    // });
    // res.json(data)
})

module.exports = router;