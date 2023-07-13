const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get ('/', async(req,res)=>{


    // card1-熱門活動-> 從訂單那邊抓熱門訂單項目



    // card2-最新上架-> 最新更新日期
    const [data] = await db.query("SELECT ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`,recent_date,farthest_date,GROUP_CONCAT(DISTINCT af.`name`) AS feature_names,aty.`name` AS type_name,ag.`time`,ag.`price_adult`,CAST(ar.`avg_star` AS UNSIGNED) AS avg_star FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`JOIN (SELECT `activity_sid`, MIN(`date`) AS recent_date, MAX(`date`) AS farthest_date FROM `activity_group` GROUP BY `activity_sid`) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`JOIN ( SELECT `activity_sid`, AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid`) ar ON ai.`activity_sid` = ar.`activity_sid`WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star`");

    
    // const [data] = await db.query("SELECT ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, (SELECT ag1.`date` FROM `activity_group` ag1 WHERE ai.`activity_sid` = ag1.`activity_sid` ORDER BY ag1.`date` ASC LIMIT 1) AS recent_date, (SELECT ag2.`date` FROM `activity_group` ag2 WHERE ai.`activity_sid` = ag2.`activity_sid` ORDER BY ag2.`date` DESC LIMIT 1) AS farthest_date, GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid` GROUP BY ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`");



    //------------------------------------------
    //思考：一張card要怎麼呈現出來？->拿所有資料


    //card1-熱門活動->到時候從訂單那邊抓熱門訂單項目

    
    //card2-最新活動->最新更新日期(目前是用act_sid去排, 應該要用act_post_date去排)
    //全部資料展現：join四個資料庫, 拿到要展現的資料 (info + group + type + pic)
    //＊＊少了特點跟收藏的sql
    // const [data] = await db.query("SELECT ai. `act_sid`,`act_name`, `act_content`, `act_policy`, `act_city`, `act_area`, `act_address`, ag. `group_date`, `group_time`, `price_adult`, `price_kid`, t.`type_name`, p.`act_pic` FROM act_info ai INNER JOIN act_group ag ON ai.act_sid = ag.act_sid INNER JOIN act_type t ON ai.type_sid = t.type_sid LEFT JOIN act_pic p ON ai.act_pic_sid = p.act_pic_sid ORDER BY ai.`act_sid` DESC LIMIT 10");


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


// 測試--------------------

// const [data] = await db.query("SELECT `activity_sid`, `activity_type_sid`, `name`, `content`, `schedule`, `policy`, `must_know`, `city`, `area`, `address`, `activity_pic`, `pet_type`, `Initiated_by` FROM `activity_info` LIMIT 2");


    
    //日期處理
    data.forEach(i=>{
        i.recent_date = res.toDateString(i.recent_date)
        i.farthest_date = res.toDateString(i.farthest_date)
    });

    res.json(data)

    //用info+type篩選
    // const [data] = await db.query("SELECT * FROM `act_info` WHERE `type_sid`=1");
    // res.json(data)

    //用activity type篩選
})




module.exports = router;