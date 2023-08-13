const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

// 首頁
router.get("/", async (req, res) => {
  // 熱門活動-> 依 order_details排序 排名前4
  const [popularCount] = await db.query(
    "SELECT subquery.activity_sid, subquery.name, subquery.content, subquery.city, subquery.area, subquery.address, subquery.activity_pic, subquery.recent_date, subquery.farthest_date, subquery.feature_names, subquery.type_name, subquery.time, subquery.price_adult, subquery.post_date, ai.avg_rating AS avg_rating, popular_counts.popular_count FROM (SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, MAX(ag.date) AS recent_date, MIN(ag.date) AS farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, MAX(ag.post_date) AS post_date FROM activity_info ai INNER JOIN activity_group ag ON ai.activity_sid = ag.activity_sid INNER JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid LEFT JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid LEFT JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, aty.name, ag.time, ag.price_adult) AS subquery LEFT JOIN (SELECT rel_sid AS activity_sid, COUNT(*) AS popular_count FROM order_details WHERE rel_type = 'activity' GROUP BY rel_sid) AS popular_counts ON subquery.activity_sid = popular_counts.activity_sid LEFT JOIN activity_info ai ON subquery.activity_sid = ai.activity_sid ORDER BY popular_counts.popular_count DESC LIMIT 4"
  );

  // 最新上架-> 依 post_date 排序
  const [data] = await db.query(
    "SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.time, ag.price_adult, ag.post_date, CAST(ar.avg_star AS UNSIGNED) AS avg_star, ai.avg_rating FROM activity_info ai JOIN activity_group ag ON ai.activity_sid = ag.activity_sid JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid JOIN (SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid) ag_temp ON ai.activity_sid = ag_temp.activity_sid JOIN (SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid) ar ON ai.activity_sid = ar.activity_sid WHERE ag.time IS NOT NULL AND ag.price_adult IS NOT NULL GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.activity_pic, recent_date, farthest_date, aty.name, ag.time, ag.price_adult, ag.post_date, ai.avg_rating ORDER BY ag.post_date DESC LIMIT 4"
  );

  // 熱門縣市-> 依order_details排序 排名前6
  const [topCityData] = await db.query(
    "SELECT DISTINCT ai.`city`, COUNT(*) AS `city_count` FROM `order_details` oc JOIN `activity_info` ai ON oc.`rel_sid` = ai.`activity_sid` WHERE oc.`rel_type` = 'activity' GROUP BY ai.`city` ORDER BY `city_count` DESC LIMIT 6"
  );

  // 會員願望投票區
  const [wish] = await db.query(
    "SELECT aw.activity_wish_sid, aw.member_sid, aw.name, aw.city, aw.area, aw.content, aw.other_message, aw.wish_date, IFNULL(v.vote_count, 0) AS vote_count, mi.profile FROM activity_wish aw LEFT JOIN ( SELECT activity_wish_sid, COUNT(activity_vote_sid) AS vote_count FROM activity_vote GROUP BY activity_wish_sid) v ON aw.activity_wish_sid = v.activity_wish_sid LEFT JOIN member_info mi ON aw.member_sid = mi.member_sid LIMIT 6"
  );

  // 日期處理
  data.forEach((i) => {
    i.recent_date = res.toDateDayString(i.recent_date);
    i.farthest_date = res.toDateDayString(i.farthest_date);
  });

  popularCount.forEach((v) => {
    v.recent_date = res.toDateDayString(v.recent_date);
    v.farthest_date = res.toDateDayString(v.farthest_date);
  });

  // 全部欄位都取得的 終極sql
  // SELECT ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date,
  // GROUP_CONCAT(DISTINCT af.`name`) AS feature_names, aty.`name` AS type_name, ag.`time`, ag.`price_adult`, CAST(ar.`avg_star` AS UNSIGNED) AS avg_star FROM `activity_info` ai LEFT JOIN `activity_group` ag ON ai.`activity_sid` = ag.`activity_sid` LEFT JOIN  `activity_feature_with_info` afwi ON ai.`activity_sid` = afwi.`activity_sid` LEFT JOIN `activity_feature` af ON afwi.`activity_feature_sid` = af.`activity_feature_sid` LEFT JOIN `activity_type` aty ON ai.`activity_type_sid` = aty.`activity_type_sid`
  // LEFT JOIN ( SELECT `activity_sid`, MIN(`date`) AS recent_date,  MAX(`date`) AS farthest_date FROM  `activity_group` GROUP BY `activity_sid` ) ag_temp ON ai.`activity_sid` = ag_temp.`activity_sid`
  // LEFT JOIN ( SELECT `activity_sid`,  AVG(`star`) AS avg_star FROM `activity_rating` GROUP BY `activity_sid`) ar ON ai.`activity_sid` = ar.`activity_sid` WHERE ag.`time` IS NOT NULL AND ag.`price_adult` IS NOT NULL GROUP BY ai.`activity_sid`, ai.`name`, ai.`content`, ai.`city`, ai.`area`, ai.`address`, ai.`activity_pic`, recent_date, farthest_date, aty.`name`, ag.`time`, ag.`price_adult`, ar.`avg_star`

  // 取上面全部資料
  res.json({ data, topCityData, wish, popularCount });
});

router.get("/activity", async (req, res) => {
  // 網址在這裡看 http://localhost:3002/activity-api/activity?activity_type_sid=分類值

  let output = {
    totalRows: 0,
    perPage: 8,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  // 關鍵字
  // 最新/ 最舊/ 熱門/ 地區/ 日期/ 類別/ 價格
  // 類別/ 熱門/ 最新/ 地區/ 投票區
  // 設篩選條件
  const dict = {
    台北市: "台北市",
    新北市: "新北市",
    桃園市: "桃園市",
    台中市: "台中市",
    高雄市: "高雄市",
    台南市: "台南市",
    北區: "北區",
    西屯區: "西屯區",
    苓雅區: "苓雅區",
    信義區: "信義區",

    price_ASC: "price_adult ASC",
    price_DESC: "price_adult DESC",

    date_DESC: "recent_date DESC",
    date_ASC: "recent_date ASC",
    hot_DESC: "purchase_count DESC",
  };

  // 給query string的
  let perPage = req.query.perPage || 8;
  let activity_type_sid = req.query.activity_type_sid || "";
  let keyword = req.query.keyword || "";
  let startDate = req.query.startDate || "";
  let endDate = req.query.endDate || "";
  let maxPrice = parseInt(req.query.maxPrice || 0);
  let minPrice = parseInt(req.query.minPrice || 0);
  let city = req.query.city || "";
  let area = req.query.area || "";
  let orderBy = req.query.orderBy || "date_ASC";

  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  //queryString條件判斷
  let where = " WHERE 1";

  // 價格
  let where_price = "";

  if (minPrice && maxPrice) {
    where_price += ` AND price_adult BETWEEN ${minPrice} AND ${maxPrice}`;
  }

  // 類別
  // if (activity_type_sid) {
  //   where += ` AND ai.activity_type_sid = ${activity_type_sid}`;
  // }

  if (activity_type_sid) {
    let activity_type_sids = Array.isArray(activity_type_sid)
      ? activity_type_sid
      : [activity_type_sid];

    // 將陣列轉換成字串
    let typeFilter = activity_type_sids.join(",");

    where += ` AND ai.activity_type_sid IN (${typeFilter})`;
  }

  // 關鍵字
  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND ai.name LIKE ${kw_escaped}`;
  }

  // 日期區間
  if (startDate && endDate) {
    where += ` AND ag.date BETWEEN ${db.escape(startDate)} AND ${db.escape(
      endDate
    )}`;
  } else if (startDate) {
    where += ` AND ag.date >= ${db.escape(startDate)}`;
  } else if (endDate) {
    where += ` AND ag.date <= ${db.escape(endDate)}`;
  }

  // 縣市
  if (city) {
    const cityValue = dict[city];
    where += ` AND  ai.city = '${cityValue}'  `;
  }

  // 地區
  if (area) {
    const areaValue = dict[area];
    where += ` AND  ai.area = '${areaValue}'  `;
  }

  // 排序
  let order = " ORDER BY ";
  const order_escaped = dict[orderBy];
  order += ` ${order_escaped} `;

  //取得總筆數資訊
  const sqlTotalRows = `
  SELECT COUNT(DISTINCT ai.activity_sid) AS totalRows FROM activity_info ai
  INNER JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
  INNER JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
  LEFT JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
  LEFT JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
  LEFT JOIN (
    SELECT activity_sid, AVG(star) AS star
    FROM activity_rating
    GROUP BY activity_sid
  ) ar ON ai.activity_sid = ar.activity_sid
  ${where} ${where_price}`;

  const [[{ totalRows }]] = await db.query(sqlTotalRows);
  let totalPages = 0;
  let rows = [];

  //有資料時
  if (totalRows) {
    //取得總頁數
    totalPages = Math.ceil(totalRows / perPage);

    if (page > totalPages) {
      page = totalPages;
    }

    const sqlQuery = `
    SELECT activity_sid, name, content, city, area, address, avg_rating,purchase_count,activity_pic,
      MAX(recent_date) AS recent_date, MAX(farthest_date) AS farthest_date,
      GROUP_CONCAT(DISTINCT feature_name) AS feature_names,
      type_name, time, price_adult,
      MAX(post_date) AS post_date
    FROM (
      SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address,ai.purchase_count, ai.avg_rating, ai.activity_pic,
        ag.date AS recent_date, ag.date AS farthest_date,
        af.name AS feature_name,
        aty.name AS type_name,
        aty.activity_type_sid,
        ag.time, ag.price_adult,
        ag.post_date
      FROM activity_info ai
      INNER JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
      INNER JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
      LEFT JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
      LEFT JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
      LEFT JOIN (
        SELECT activity_sid
        FROM activity_rating
        GROUP BY activity_sid
      ) ar ON ai.activity_sid = ar.activity_sid
      ${where} ${where_price}
    ) AS subquery
    GROUP BY activity_sid, name, content, city, area, address,purchase_count, avg_rating,activity_pic, type_name, time, price_adult
    ${order}
    LIMIT ${perPage * (page - 1)}, ${perPage}
  `;

    [rows] = await db.query(sqlQuery);
  }

  // 日期處理
  rows.forEach((i) => {
    i.recent_date = res.toDateDayString(i.recent_date);
    i.farthest_date = res.toDateDayString(i.farthest_date);
    i.post_date = res.toDateDayString(i.post_date);
  });

  output = {
    ...output,
    totalRows,
    perPage,
    totalPages,
    page,
    rows,
    // likeDatas,
  };

  return res.json(output);
});

// 讀取收藏清單
router.get("/show-like-list", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  let likeDatas = [];

  //用會員編號去取得某一個會員的喜愛清單
  if (member) {
    const sql_likeList = `SELECT 
    ai.activity_sid, 
    ai.name, 
    ai.city, 
    ai.area, 
    ai.activity_pic, 
    recent_date, 
    farthest_date, 
    ag.price_adult,
    al.member_sid, 
    al.date
  FROM
    activity_info ai
  JOIN 
    activity_group ag ON ai.activity_sid = ag.activity_sid
  JOIN 
    (
      SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date 
      FROM activity_group 
      GROUP BY activity_sid
    ) ag_temp ON ai.activity_sid = ag_temp.activity_sid
  JOIN 
    activity_like al ON ai.activity_sid = al.activity_sid
    WHERE member_sid='${member}'
  GROUP BY 
    ai.activity_sid, ai.name, ai.city, ai.area, ai.activity_pic, recent_date, farthest_date, ag.price_adult, al.member_sid, al.date
  ORDER BY al.date DESC`;
    [likeDatas] = await db.query(sql_likeList);

    // 日期處理
    likeDatas.forEach((v) => {
      v.recent_date = res.toDateString(v.recent_date);
      v.farthest_date = res.toDateString(v.farthest_date);
      v.date = res.toDateString(v.date);
    });

    // 圖片處理 (字串->陣列)

    likeDatas.map((pic) => {
      const imgNames = pic.activity_pic;
      const imgs = imgNames.split(",");
      const trimmedImgs = imgs.map((img) => img.trim());
      pic.activity_pic = trimmedImgs;
    });
  }

  output = {
    ...output,
    likeDatas,
  };
  return res.json(output);
});

// 刪除收藏清單
router.delete("/likelist/:aid", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  const { aid } = req.params;
  let sql_deleteLikeList = "DELETE FROM `activity_like` WHERE ";
  if (aid === "all") {
    sql_deleteLikeList += `member_sid = '${member}'`;
  } else {
    sql_deleteLikeList += `member_sid = '${member}' AND activity_sid='${aid}'`;
  }

  try {
    const [result] = await db.query(sql_deleteLikeList);
    res.json({ ...result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }

  // let member = "";
  // if (res.locals.jwtData) {
  //   member = res.locals.jwtData.id;
  // }

  // const { aid } = req.params;
  // let sql_deleteLikeList = "DELETE FROM `activity_like` WHERE ";
  // if (aid === "all") {
  //   sql_deleteLikeList += `member_sid = ?`;
  // } else {
  //   sql_deleteLikeList += `member_sid = ? AND activity_sid = ?`;
  // }

  // try {
  //   const [result] = await db.query(
  //     sql_deleteLikeList,
  //     aid === "all" ? [member] : [member, aid]
  //   );
  //   res.json({ ...result });
  // } catch (error) {
  //   console.log(error);
  //   res.status(500).json({ error: "An error occurred" });
  // }
});

// faheart新增收藏清單
router.post("/addlikelist/:aid", async (req, res) => {
  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  const { aid } = req.params;

  // Use MySQL DATE_FORMAT function to format the date directly in the SQL query
  let sql_insertLikeList =
    "INSERT INTO `activity_like` (`activity_sid`, `member_sid`, `date`) VALUES (?, ?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'))";

  try {
    // Execute INSERT INTO query
    const [result] = await db.query(sql_insertLikeList, [aid, member]);
    res.json({ ...result });
    console.log("會員ID:", member);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// [aid] 動態路由
router.get("/activity/:activity_sid", async (req, res) => {
  // 網址在這裡看 http://localhost:3002/activity-api/activity/活動的sid

  let output = {
    actDetailRows: [],
    actImageRows: [],
    actDateRows: [],
    actFeatureRows: [],
    actRatingRows: [],
    actRecommend: [],
    actCartTotalQtyRows: [],
  };

  const { activity_sid } = req.params;
  console.log(req.params);

  // const sql_activityDetail = `
  //   SELECT ai.activity_sid, ai.name, ai.content,ai.policy,ai.schedule,ai.policy,ai.must_know, ai.city, ai.area, ai.address, recent_date, farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names, aty.name AS type_name, ag.date, ag.time, ag.price_adult, CAST(ar.avg_star AS UNSIGNED) AS avg_star
  //   FROM activity_info ai
  //   JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
  //   JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
  //   JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
  //   JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
  //   LEFT JOIN (SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date FROM activity_group GROUP BY activity_sid) ag_temp ON ai.activity_sid = ag_temp.activity_sid
  //   LEFT JOIN (SELECT activity_sid, AVG(star) AS avg_star FROM activity_rating GROUP BY activity_sid) ar ON ai.activity_sid = ar.activity_sid
  //   WHERE ai.activity_sid = ${activity_sid}
  //   GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, recent_date, farthest_date, aty.name, ag.date, ag.time, ag.price_adult, ar.avg_star`;

  const sql_activityDetail = `
  SELECT
  ai.activity_sid,
  ai.name,
  ai.content,
  ai.policy,
  ai.schedule,
  ai.policy,
  ai.must_know,
  ai.city,
  ai.area,
  ai.address,
  ai.avg_rating,
  recent_date,
  farthest_date,
  GROUP_CONCAT(DISTINCT af.name) AS feature_names,
  aty.name AS type_name,
  aty.activity_type_sid,
  ag.date,
  ag.time,
  ag.price_adult,
  COUNT(DISTINCT ar.activity_rating_sid) AS rating_count
FROM activity_info ai
JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
LEFT JOIN (
  SELECT activity_sid, MIN(date) AS recent_date, MAX(date) AS farthest_date
  FROM activity_group GROUP BY activity_sid
) ag_temp ON ai.activity_sid = ag_temp.activity_sid
LEFT JOIN activity_rating ar ON ai.activity_sid = ar.activity_sid
WHERE ai.activity_sid = ${activity_sid}
GROUP BY
  ai.activity_sid,
  ai.name,
  ai.content,
  ai.city,
  ai.area,
  ai.address,
  ai.avg_rating,
  recent_date,
  farthest_date,
  aty.name,
  aty.activity_type_sid,
  ag.date,
  ag.time,
  ag.price_adult LIMIT 1`;

  let [actDetailRows] = await db.query(sql_activityDetail);

  // 取得 活動照片
  const sql_image = `SELECT activity_sid, activity_pic FROM activity_info WHERE activity_sid= ${activity_sid}`;

  let [actImageRows] = await db.query(sql_image);

  // 取得 各期別
  const sql_date = `SELECT activity_group_sid, activity_sid, date, time FROM activity_group WHERE activity_sid= ${activity_sid}`;

  let [actDateRows] = await db.query(sql_date);

  // 取得 feature
  const sql_feature = `SELECT af.activity_feature_sid, af.name
  FROM activity_feature af
  JOIN activity_feature_with_info afi ON af.activity_feature_sid = afi.activity_feature_sid WHERE activity_sid= ${activity_sid}`;

  let [actFeatureRows] = await db.query(sql_feature);

  // 取得 rating
  const sql_rating = `SELECT r.*, m.name, m.profile FROM activity_rating AS r LEFT JOIN member_info m ON m.member_sid=r.member_sid WHERE activity_sid="${activity_sid}" ORDER BY r.date DESC`;

  let [actRatingRows] = await db.query(sql_rating);

  // 取得 推薦活動
  const customerLookforPet = actDetailRows[0].type_name;
  const sql_actRecommend = `
  SELECT subquery.*
    FROM (
      SELECT ai.activity_sid, ai.name, ai.city, ai.area, ai.address, ai.avg_rating,ai.activity_pic,
        MAX(ag.date) AS recent_date, MIN(ag.date) AS farthest_date, GROUP_CONCAT(DISTINCT af.name) AS feature_names,
        aty.name AS type_name, ag.time, ag.price_adult, MAX(ag.post_date) AS post_date
      FROM activity_info ai
      JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
      JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
      JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
      JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
      LEFT JOIN activity_rating ar ON ai.activity_sid = ar.activity_sid
     
      WHERE aty.name = '${customerLookforPet}' 
      AND ag.time IS NOT NULL AND ag.price_adult IS NOT NULL
      GROUP BY ai.activity_sid, ai.name, ai.city, ai.area, ai.address,ai.avg_rating, ai.activity_pic, aty.name, ag.time, ag.price_adult
    ) AS subquery
    ORDER BY subquery.post_date DESC
    LIMIT 2`;

  let [actRecommend] = await db.query(sql_actRecommend);

  // 取得 總購買數量
  const sql_cartTotalQty = `SELECT rel_sid, COUNT(*) AS purchase_count
  FROM order_details
  WHERE rel_type='activity' AND rel_sid="${activity_sid}"
  GROUP BY rel_sid`;

  let [actCartTotalQtyRows] = await db.query(sql_cartTotalQty);

  // feature處理 (字串->陣列)
  // actDetailRows.map((activity) => {
  //   const featureNames = activity.feature_names;
  //   const features = featureNames.split(',');
  //   const trimmedFeatures = features.map(feature => feature.trim());
  //   activity.feature_names = trimmedFeatures;
  //   console.log(trimmedFeatures); //測試
  //   console.log(activity.feature_names); //測試
  // });

  // 圖片處理 (字串->陣列)
  // actImageRows.map((pic) => {
  //   const imgNames = pic.activity_pic;
  //   const imgs = imgNames.split(',');
  //   const trimmedImgs = imgs.map(img => img.trim());
  //   pic.activity_pic = trimmedImgs;
  //   console.log(trimmedImgs); //測試
  //   console.log(pic.imgNames); //測試
  // });

  // 日期處理 (actDetailRows + actDateRows+actRatingRows)
  actDetailRows.map((i) => {
    i.recent_date = res.toDateDayString(i.recent_date);
    i.farthest_date = res.toDateDayString(i.farthest_date);
    i.date = res.toDateDayString(i.date);
  });

  actDateRows.map((v) => {
    v.date = res.toDateString(v.date);
  });

  actRatingRows.map((j) => {
    j.date = res.toDateString(j.date);
  });

  actRecommend.map((k) => {
    k.recent_date = res.toDateDayString(k.recent_date);
    k.farthest_date = res.toDateDayString(k.farthest_date);
  });

  output = {
    ...output,
    actDetailRows,
    actImageRows,
    actDateRows,
    actFeatureRows,
    actRatingRows,
    actRecommend,
    actCartTotalQtyRows,
  };

  return res.json(output);
});

// [aid] 新增活動訂單 + 判斷是否已存在相同activity_group_sid
router.post("/order-activity/:activity_sid", async (req, res) => {
  console.log("Reached the order-activity route handler");
  console.log("Request Params:", req.params);
  console.log("Request Body:", req.body);

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  const { activity_sid } = req.params;
  console.log(req.params);
  const { rel_seq_sid, adult_qty, child_qty } = req.body;

  // 抓資料 (判斷用)
  const sql_checkExistingCartItem = `
    SELECT cart_sid FROM order_cart WHERE rel_type='activity' AND member_sid='${member}' AND rel_seq_sid='${rel_seq_sid}' AND order_status='001'`;

  // 新增
  const sql_orderActivity = `
    INSERT INTO order_cart(member_sid, rel_type, rel_sid, rel_seq_sid, product_qty, adult_qty, child_qty, order_status) VALUES (?, 'activity', ?, ?, null, ?, ?, '001')`;

  try {
    // 去資料庫查詢 是否已存在相同activity_group_sid
    const [existingCartItem] = await db.query(sql_checkExistingCartItem);
    if (existingCartItem.length > 0) {
      throw new Error("該項目已經在購物車中");
    }

    const [result] = await db.query(sql_orderActivity, [
      member,
      activity_sid,
      rel_seq_sid,
      adult_qty,
      child_qty,
    ]);

    res.json({ ...result });
    console.log("會員ID:", member);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

//讀取我要投票
router.get("/vote", async (req, res) => {
  // 網址在這裡看 http://localhost:3002/activity-api/vote

  let output = {
    totalRows: 0,
    perPage: 12,
    totalPages: 0,
    page: 1,
    rows: [],
    topVoteRows: [],
  };

  // 給query string的
  let perPage = req.query.perPage || 12;
  let keyword = req.query.keyword || "";
  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  //queryString
  let where = " WHERE 1";

  // 關鍵字
  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND aw.name LIKE ${kw_escaped}`;
  }

  // 分頁
  const sqlQuery = `
    SELECT aw.activity_wish_sid, aw.member_sid, aw.name, aw.city, aw.area, aw.content, aw.other_message, aw.wish_date, IFNULL(v.vote_count, 0) AS vote_count, mi.profile
    FROM activity_wish aw
    LEFT JOIN (
      SELECT activity_wish_sid, COUNT(activity_vote_sid) AS vote_count
      FROM activity_vote
      GROUP BY activity_wish_sid
    ) v ON aw.activity_wish_sid = v.activity_wish_sid
    LEFT JOIN member_info mi ON aw.member_sid = mi.member_sid
    ${where}
    ORDER BY aw.wish_date DESC
    LIMIT ${perPage * (page - 1)}, ${perPage}
  `;

  // 總行數
  const sqlTotalRows = `
    SELECT COUNT(*) AS totalRows
    FROM activity_wish aw
    LEFT JOIN (
      SELECT activity_wish_sid, COUNT(activity_vote_sid) AS vote_count
      FROM activity_vote
      GROUP BY activity_wish_sid
    ) v ON aw.activity_wish_sid = v.activity_wish_sid
    LEFT JOIN member_info mi ON aw.member_sid = mi.member_sid
    ${where}
  `;

  const [[{ totalRows }]] = await db.query(sqlTotalRows);

  const [rows] = await db.query(sqlQuery);

  // 呼聲最高
  const top_vote = `SELECT aw.activity_wish_sid, aw.member_sid, aw.name, aw.city, aw.area, aw.content, aw.other_message, aw.wish_date, IFNULL(v.vote_count, 0) AS vote_count, mi.profile FROM activity_wish aw LEFT JOIN ( SELECT activity_wish_sid, COUNT(activity_vote_sid) AS vote_count FROM activity_vote GROUP BY activity_wish_sid) v ON aw.activity_wish_sid = v.activity_wish_sid LEFT JOIN member_info mi ON aw.member_sid = mi.member_sid LIMIT 3`;

  const [topVoteRows] = await db.query(top_vote);

  // 日期處理
  rows.forEach((i) => {
    i.wish_date = new Date(i.wish_date);
  });

  const totalPages = Math.ceil(totalRows / perPage);

  output = {
    ...output,
    totalRows,
    perPage,
    totalPages,
    page,
    rows,
    topVoteRows,
  };

  return res.json(output);
});


//新增 投票
// router.post("/addvote", async (req, res) => {
//   try {
//     let member = "";
//     if (res.locals.jwtData) {
//       member = res.locals.jwtData.id;
//     }

  
//     const { activity_wish_sid } = req.body; // 假設前端傳遞的是活動願望的 ID

 
//     const sql_addVote = `
//       INSERT INTO activity_vote (member_sid, activity_wish_sid, date, status)
//       VALUES (?, ?, NOW(), '0')
//     `;

//     const [result] = await db.query(sql_addVote, [member, activity_wish_sid]);

//     return res.status(201).json({ message: "Vote added successfully", result });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

router.post("/addvote", async (req, res) => {
  try {
    let member = "";
    if (res.locals.jwtData) {
      member = res.locals.jwtData.id;
    }

    const { activity_wish_sid } = req.body;

    const sql_addVote = `
      INSERT INTO activity_vote (member_sid, activity_wish_sid, date, status)
      VALUES (?, ?, NOW(), '0')
    `;

    const [result] = await db.query(sql_addVote, [member, activity_wish_sid]);

    return res.status(201).json({ message: "Vote added successfully", result });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});


//讀取願望列表
router.get("/wishlist", async (req, res) => {
  // 網址在這裡看 http://localhost:3002/activity-api/vote

  let output = {
    totalRows: 0,
    perPage: 8,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  const perPage = req.query.perPage || 8;
  const keyword = req.query.keyword || "";
  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  let whereConditions = "";

  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    whereConditions += ` AND ai.name LIKE ${kw_escaped}`;
  }

  const sqlTotalRows = `
    SELECT COUNT(DISTINCT ai.activity_sid) AS totalRows
    FROM activity_info ai
    INNER JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
    INNER JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
    LEFT JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
    LEFT JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
    WHERE aty.activity_type_sid = 6 ${whereConditions}
  `;

  const [[{ totalRows }]] = await db.query(sqlTotalRows);
  let totalPages = Math.ceil(totalRows / perPage);

  if (page > totalPages) {
    page = totalPages;
  }

  const sqlQuery = `
    SELECT ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.avg_rating, ai.purchase_count, ai.activity_pic,
      MAX(ag.date) AS recent_date, MAX(ag.date) AS farthest_date,
      GROUP_CONCAT(DISTINCT af.name) AS feature_names,
      aty.name AS type_name, ag.time, ag.price_adult,
      MAX(ag.post_date) AS post_date
    FROM activity_info ai
    INNER JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
    INNER JOIN activity_feature_with_info afwi ON ai.activity_sid = afwi.activity_sid
    LEFT JOIN activity_feature af ON afwi.activity_feature_sid = af.activity_feature_sid
    LEFT JOIN activity_type aty ON ai.activity_type_sid = aty.activity_type_sid
    WHERE aty.activity_type_sid = 6 ${whereConditions}
    GROUP BY ai.activity_sid, ai.name, ai.content, ai.city, ai.area, ai.address, ai.avg_rating, ai.purchase_count, ai.activity_pic,
      type_name, ag.time, ag.price_adult
    LIMIT ${perPage * (page - 1)}, ${perPage}
  `;

  const [rows] = await db.query(sqlQuery);

  rows.forEach((i) => {
    i.recent_date = i.recent_date ? res.toDateDayString(i.recent_date) : null;
    i.farthest_date = i.farthest_date
      ? res.toDateDayString(i.farthest_date)
      : null;
    i.post_date = i.post_date ? res.toDateDayString(i.post_date) : null;
  });

  output = {
    ...output,
    totalRows,
    perPage,
    totalPages,
    page,
    rows,
  };

  return res.json(output);
});

//wish新增願望
router.post("/wish", async (req, res) => {
  console.log("Reached the wish route handler");
  console.log("Request Body:", req.body);

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  const { name, city, area, content, other_message } = req.body;

  // 新增
  const sql_addWish = `
    INSERT INTO activity_wish(member_sid, name, city, area, content, other_message, wish_date)
    VALUES (?, ?, ?, ?, ?, ?, NOW())`;

  try {
    // 執行
    const [result] = await db.query(sql_addWish, [
      member,
      name,
      city,
      area,
      content,
      other_message,
    ]);

    res.json({ ...result });
    console.log("會員ID:", member);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = router;
