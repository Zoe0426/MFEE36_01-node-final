const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/:cat', async(req,res)=>{
    const {cat}=req.params

    //製作類別字典，以判斷動態路由，所選擇責的類別
    const dict={
        can:['category_detail_sid','CA'],
        feed:['category_detail_sid','FE'],
        snack:['category_detail_sid','SN'],
        health:['category_detail_sid','HE'],
        dress:['category_detail_sid','DR'],
        outdoor:['category_detail_sid','OD'],
        toy:['category_detail_sid','TO'],
        other:['category_detail_sid','OT'],
        dog:['pro_for','D'],
        cat:['pro_for','C'] }

    //取得卡片資訊
    const sql_cardData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
        FROM shop_product p
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE ${dict[cat][0]}='${dict[cat][1]}'
        GROUP BY p.product_sid
        LIMIT 1, 1000`
        const [cardData]=await db.query(sql_cardData)
        console.log(cardData)

    //將卡片內的日期轉換為當地格式
    cardData.forEach((v)=>{
            v.shelf_date=res.toDatetimeString(v.shelf_date)
            v.update_date=res.toDatetimeString(v.update_date)
        })
    
    //取得總筆數資訊
    const sql_totalRows=`SELECT COUNT(1) FROM shop_product WHERE ${dict[cat][0]}='${dict[cat][1]}'`
    const [totalRows]=await db.query(sql_totalRows)


    res.json({totalRows,cardData})
        // data.forEach(i=>{
        //     i.birthday = res.toDatetimeString(i.birthday)
        //     i.created_at = res.toDatetimeString(i.created_at)
        // });
        // res.json(data)
})

module.exports = router;