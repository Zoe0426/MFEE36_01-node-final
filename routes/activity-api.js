const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{
    //思考：一張card要怎麼呈現出來？->拿所有資料


    //card1-熱門活動->到時候從訂單那邊抓熱門訂單項目

    
    //card2-最新活動->最新更新日期(目前是用act_sid去排, 應該要用act_post_date去排)
    //全部資料展現：join四個資料庫, 拿到要展現的資料 (info + group + type + pic)
    //＊＊少了特點跟收藏的sql
    const [data] = await db.query("SELECT ai. `act_sid`,`act_name`, `act_content`, `act_policy`, `act_city`, `act_area`, `act_address`, ag. `group_date`, `group_time`, `price_adult`, `price_kid`, t.`type_name`, p.`act_pic` FROM act_info ai INNER JOIN act_group ag ON ai.act_sid = ag.act_sid INNER JOIN act_type t ON ai.type_sid = t.type_sid LEFT JOIN act_pic p ON ai.act_pic_sid = p.act_pic_sid ORDER BY ai.`act_sid` DESC LIMIT 10");


    //card3-熱門縣市->排名前6
    // const sqlQuery = `
    // SELECT act_info.act_city, COUNT(*) AS city_count
    // FROM ord_details
    // JOIN act_info ON ord_details.rel_sid = act_info.act_sid
    // GROUP BY act_info.act_city DESC
    // LIMIT 6;
    // `;
    // 执行查询
    // const [data] = await db.query(sqlQuery);


    
    //日期處理
    data.forEach(i=>{
        i.group_date = res.toDateString(i.group_date)
    
    });

    res.json(data)

    //用info+type篩選
    // const [data] = await db.query("SELECT * FROM `act_info` WHERE `type_sid`=1");
    // res.json(data)

    //用activity type篩選
})




module.exports = router;