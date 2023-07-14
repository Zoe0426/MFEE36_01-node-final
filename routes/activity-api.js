const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();


router.get("/", async (req, res) => {

  // card1-熱門活動-> 從訂單那邊抓熱門訂單項目



  // card2-最新上架-> 用上架日期排序
  const [data] = await db.query(
    "SELECT ai.`activity_sid`, ai.`name`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name, ag.`time`, ag.`price_adult`, CAST(ar.`avg_star` AS UNSIGNED) AS avg_star, ag.`post_date`FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN`activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid`JOIN`activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid`JOIN`activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`JOIN( SELECT `activity_sid`, MIN(`date`) AS recent_date, MAX(`date`) AS farthest_date FROM `activity_group` GROUP BY `activity_sid` ) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`JOIN ( SELECT `activity_sid`, AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid` ) ar ON ai.`activity_sid` = ar.`activity_sid` WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star`, ag.`post_date` ORDER BY ag.`post_date` DESC");



  //card3-熱門縣市->排名前6

  

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
  data.forEach((i) => {
    i.recent_date = res.toDateString(i.recent_date);
    i.farthest_date = res.toDateString(i.farthest_date);
  });

  res.json(data);
});

router.get("/aid", async (req, res) => {
    
  // 拿取各分類資料

  const [data] = await db.query(
    "SELECT ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`,recent_date,farthest_date,GROUP_CONCAT(DISTINCT af.`name`) AS feature_names,aty.`name` AS type_name,ag.`time`,ag.`price_adult`,CAST(ar.`avg_star` AS UNSIGNED) AS avg_star FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`JOIN (SELECT `activity_sid`, MIN(`date`) AS recent_date, MAX(`date`) AS farthest_date FROM `activity_group` GROUP BY `activity_sid`) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`JOIN ( SELECT `activity_sid`, AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid`) ar ON ai.`activity_sid` = ar.`activity_sid`WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star`"
  );

  // const [data] = await db.query("SELECT ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, (SELECT ag1.`date` FROM `activity_group` ag1 WHERE ai.`activity_sid` = ag1.`activity_sid` ORDER BY ag1.`date` ASC LIMIT 1) AS recent_date, (SELECT ag2.`date` FROM `activity_group` ag2 WHERE ai.`activity_sid` = ag2.`activity_sid` ORDER BY ag2.`date` DESC LIMIT 1) AS farthest_date, GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid` GROUP BY ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`");

  //日期處理
  data.forEach((i) => {
    i.recent_date = res.toDateString(i.recent_date);
    i.farthest_date = res.toDateString(i.farthest_date);
  });

  res.json(data);
});

module.exports = router;
