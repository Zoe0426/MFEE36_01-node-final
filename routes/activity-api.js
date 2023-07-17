const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

// 首頁
router.get("/", async (req, res) => {


  // 熱門活動-> 依訂單數排序

  // 最新上架-> 依 post_date 排序
  const [data] = await db.query(
    "SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, ag.post_date, CAST(ar.avg_star AS UNSIGNED) AS avg_star FROM activity_info ai JOIN activity_group ag ON ai.activity_sid = ag.activity_sid JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid JOIN ( SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid ) ag_temp ON ai.activity_sid = ag_temp.activity_sid JOIN ( SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid ) ar ON ai.activity_sid = ar.activity_sid WHERE ag.time IS NOT NULL AND ag.price_adult IS NOT NULL GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, aty.name, ag.time, ag.price_adult, ag.post_date ORDER BY ag.post_date DESC LIMIT 4"
  );


  // const [data] = await db.query(
  //   "SELECT ai.`activity_sid`, ai.`name`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name, ag.`time`, ag.`price_adult`, CAST(ar.`avg_star` AS UNSIGNED) AS avg_star, ag.`post_date`FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN`activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid`JOIN`activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid`JOIN`activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`JOIN( SELECT `activity_sid`, MIN(`date`) AS recent_date, MAX(`date`) AS farthest_date FROM `activity_group` GROUP BY `activity_sid` ) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`JOIN ( SELECT `activity_sid`, AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid` ) ar ON ai.`activity_sid` = ar.`activity_sid` WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star`, ag.`post_date` ORDER BY ag.`post_date` DESC LIMIT 4"
  // );

  // 熱門縣市-> 依訂單排序 排名前6
  const [topCityData] = await db.query(
    "SELECT DISTINCT ai.`city`, COUNT(*) AS `city_count` FROM `order_cart` oc JOIN `activity_info` ai ON oc.`rel_sid` = ai.`activity_sid` WHERE oc.`rel_type` = 'activity' GROUP BY ai.`city` ORDER BY `city_count` DESC LIMIT 6"
  );

  // 會員願望投票區
  const [wish] = await db.query(
    "SELECT aw.activity_wish_sid, aw.member_sid, aw.name, aw.city, aw.area, aw.content, aw.other_message, aw.wish_date, IFNULL(v.vote_count, 0) AS vote_count FROM activity_wish aw LEFT JOIN ( SELECT activity_wish_sid, COUNT(activity_vote_sid) AS vote_count FROM activity_vote GROUP BY activity_wish_sid ) v ON aw.activity_wish_sid = v.activity_wish_sid LIMIT 6"
  );

  // 日期處理
  data.forEach((i) => {
    i.recent_date = res.toDateString(i.recent_date);
    i.farthest_date = res.toDateString(i.farthest_date);
  });


  // 取上面全部資料
  res.json({ data, topCityData, wish });
});


router.get("/activity", async (req, res) => {
  // 網址在這裡看 http://localhost:3002/activity-api/activity?activity_type_sid=分類值

  const { activity_type_sid, keyword } = req.query;
  console.log(req.query);

  let where = " WHERE 1 ";

  if (activity_type_sid) {
    where += ` AND aty.activity_type_sid = ${activity_type_sid}`;
  }

  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND ai.name LIKE ${kw_escaped}`;
  }

  const sqlQuery = `
    SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star
    FROM activity_info ai
    JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
    JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
    JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
    JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
    JOIN (SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid) ag_temp ON ai.activity_sid = ag_temp.activity_sid
    JOIN (SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid) ar ON ai.activity_sid = ar.activity_sid
    ${where}
    GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, aty.name, ag.time, ag.price_adult, ar.avg_star
    LIMIT 0, 16`;

  const [cid_data] = await db.query(sqlQuery);

 



  //日期處理
  cid_data.forEach((i) => {
    i.recent_date = res.toDateString(i.recent_date);
    i.farthest_date = res.toDateString(i.farthest_date);
  });


  res.json({ cid_data });
});


// list 拿取各分類資料 (old)
// router.get("/activity", async (req, res) => {
//     // 網址在這裡看 http://localhost:3002/activity-api/activity?activity_type_sid=分類值

//     const { activity_type_sid } = req.query;
//     console.log(req.query);
//   const dict = {}; // 空對象

//   // 從資料庫拿 activity_type_sid 和對應的值
//   const activityTypes = [
//     { activity_type_sid: 1, value: "1" },
//     { activity_type_sid: 2, value: "2" },
//     { activity_type_sid: 3, value: "3" },
//     { activity_type_sid: 4, value: "4" },
//     { activity_type_sid: 5, value: "5" },
//     { activity_type_sid: 6, value: "6" },
//   ];

//   // 動態生成 dict 
//   activityTypes.forEach((type) => {
//     dict[type.activity_type_sid] = ["activity_type_sid", type.value];
//   });

//   let where = " WHERE 1 ";

//   if (activity_type_sid && dict[activity_type_sid]) {
//     const typeClause = `${dict[activity_type_sid][0]} = '${dict[activity_type_sid][1]}'`;
//     where += ` AND aty.${typeClause}`;
//   }


//   const sqlQuery = `
//     SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star
//     FROM activity_info ai
//     JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
//     JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
//     JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
//     JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
//     JOIN (SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid) ag_temp ON ai.activity_sid = ag_temp.activity_sid
//     JOIN (SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid) ar ON ai.activity_sid = ar.activity_sid
//     ${where}
//     GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, aty.name, ag.time, ag.price_adult, ar.avg_star
//     LIMIT 0, 16`;

//   const [cid_data] = await db.query(sqlQuery);

//   // const sqlQuery = `
//   // SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star
//   // FROM activity_info ai
//   // JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
//   // JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
//   // JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
//   // JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
//   // JOIN (SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid) ag_temp ON ai.activity_sid = ag_temp.activity_sid
//   // JOIN (SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid) ar ON ai.activity_sid = ar.activity_sid
//   // ${where}
//   // GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, aty.name, ag.time, ag.price_adult, ar.avg_star
//   // LIMIT 0, 16`;


//   // 卡片上所有資訊的sql (without 變數)
//   // SELECT ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`,recent_date,farthest_date,GROUP_CONCAT(DISTINCT af.`name`) AS feature_names,aty.`name` AS type_name,ag.`time`,ag.`price_adult`,CAST(ar.`avg_star` AS UNSIGNED) AS avg_star FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`JOIN (SELECT `activity_sid`, MIN(`date`) AS recent_date, MAX(`date`) AS farthest_date FROM `activity_group` GROUP BY `activity_sid`) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`JOIN ( SELECT `activity_sid`, AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid`) ar ON ai.`activity_sid` = ar.`activity_sid`WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star` LIMIT 0, 16

//   // const [data] = await db.query("SELECT ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, (SELECT ag1.`date` FROM `activity_group` ag1 WHERE ai.`activity_sid` = ag1.`activity_sid` ORDER BY ag1.`date` ASC LIMIT 1) AS recent_date, (SELECT ag2.`date` FROM `activity_group` ag2 WHERE ai.`activity_sid` = ag2.`activity_sid` ORDER BY ag2.`date` DESC LIMIT 1) AS farthest_date, GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name FROM `activity_info` ai JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` JOIN `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid` GROUP BY ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`");


//   // 關鍵字搜尋 (搜尋 活動名稱)
//   // 網址在這裡看 http://localhost:3002/activity-api/activity?activity_type_sid=分類值&keyword=關鍵字
//   const keyword = req.query.keyword || "";
  
//   if (keyword) {
//     const kw_escaped = db.escape("%" + keyword + "%");
//     where += ` AND ( 
//       ai.name LIKE ${kw_escaped} 
//     )`;
//   }
  
//   const [sqlQueryKeyword] = await db.query(`
//   SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star, ag.post_date
//   FROM activity_info ai
//   JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
//   JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
//   JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
//   JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
//   JOIN (
//     SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date
//     FROM activity_group
//     GROUP BY activity_sid
//   ) ag_temp ON ai.activity_sid = ag_temp.activity_sid
//   JOIN (
//     SELECT activity_sid, AVG(star) AS avg_star
//     FROM activity_rating
//     GROUP BY activity_sid
//   ) ar ON ai.activity_sid = ar.activity_sid
//   ${where}
//   GROUP BY
//     ai.activity_sid,
//     ai.name,
//     ai.content,
//     ai.city,
//     ai.area,
//     ai.address,
//     ai.activity_pic,
//     recent_date,
//     farthest_date,
//     aty.name,
//     ag.time,
//     ag.price_adult,
//     ar.avg_star,
//     ag.post_date
// `);

  
//   // const keyword = req.query.keyword || "";
//   // let where = " WHERE 1 ";

//   // if (keyword) {
//   //   const kw_escaped = db.escape("%" + keyword + "%");
//   //   where += ` AND ( 
//   //     ai.name LIKE ${kw_escaped} 
//   //   )`;
//   // }

//   // const [sqlQuery] = await query(`SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star, ag.post_date
//   // FROM activity_info ai
//   // JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
//   // JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
//   // JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
//   // JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
//   // JOIN (
//   //   SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date
//   //   FROM activity_group
//   //   GROUP BY activity_sid
//   // ) ag_temp ON ai.activity_sid = ag_temp.activity_sid
//   // JOIN (
//   //   SELECT activity_sid, AVG(star) AS avg_star
//   //   FROM activity_rating
//   //   GROUP BY activity_sid
//   // ) ar ON ai.activity_sid = ar.activity_sid
//   // ${where}`);



//   //日期處理
//   cid_data.forEach((i) => {
//     i.recent_date = res.toDateString(i.recent_date);
//     i.farthest_date = res.toDateString(i.farthest_date);
//   });

//   sqlQueryKeyword.forEach((i) => {
//     i.recent_date = res.toDateString(i.recent_date);
//     i.farthest_date = res.toDateString(i.farthest_date);
//   });



//   res.json({cid_data, sqlQueryKeyword});
// });

module.exports = router;
