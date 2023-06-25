const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    const sql=`SELECT COUNT(1), p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid
    GROUP BY p.product_sid
    LIMIT 1, 1000`
    const [result]=await db.query(sql)
    res.json(result)
    // data.forEach(i=>{
    //     i.birthday = res.toDatetimeString(i.birthday)
    //     i.created_at = res.toDatetimeString(i.created_at)
    // });
    // res.json(data)
})

module.exports = router;