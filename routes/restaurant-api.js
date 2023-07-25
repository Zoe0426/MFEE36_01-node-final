const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

router.get("/", async (req, res) => {
  let output = {
    rows1: [],
    rows2: [],
  };

  //排序
  // let orderBy = req.query.orderBy || "hot_DESC";
  // let order = " ORDER BY ";
  // const order_escaped = dict[orderBy];
  // order += ` ${order_escaped} `;
  const sql1 = `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names,
  ROUND(AVG(rr.friendly), 1) AS average_friendly,
  COUNT(b.booking_sid) AS booking_count
  FROM
  restaurant_information AS r
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
  JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
  JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
  LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
  LEFT JOIN restaurant_booking AS b ON r.rest_sid = b.rest_sid
  WHERE 1
  GROUP BY
  r.rest_sid,
  r.name,
  r.city,
  r.area
  ORDER BY
    booking_count DESC
    LIMIT 9;`;

  // ORDER BY hot_DESC
  [rows1] = await db.query(sql1);

  const sql2 = `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names,
  ROUND(AVG(rr.friendly), 1) AS average_friendly,
  COUNT(b.booking_sid) AS booking_count
  FROM
  restaurant_information AS r
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
  JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
  JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
  LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
  LEFT JOIN restaurant_booking AS b ON r.rest_sid = b.rest_sid
  WHERE 1
  GROUP BY
  r.rest_sid,
  r.name,
  r.city,
  r.area
  ORDER BY
    average_friendly DESC
    LIMIT 9;`;

  // ORDER BY hot_DESC
  [rows2] = await db.query(sql2);

  output = { ...output, rows1, rows2 };
  return res.json(output);
});
router.get("/list", async (req, res) => {
  let output = {
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  const dict = {
    no_rope: 6,
    free: 8,
    sell_food: 3,
    tableware: 4,
    clean: 9,
    have_seat: 4,
    hot_DESC: "booking_count DESC",
    new_DESC: "r.created_at DESC",
    cmt_DESC: "average_friendly DESC",
    brunch: 1,
    afternoon_tea: 2,
    bistro: 3,
    barbecue: 4,
    hot_pot: 5,
    coffee_tea: 6,
    chinese_cuisine: 7,
    japan_cuisine: 8,
    koren_cuisine: 9,
    us_cuisine: 10,
    italian_cuisine: 11,
    ice: 12,
  };
  const locationDict = {
    台北市: "台北市",
    新北市: "新北市",
    大安區: "大安區",
    台中市: "台中市",
    西區: "西區",
    大同區: "大同區",
    中正區: "中正區",
  };
  //queryString條件判斷
  let where = " WHERE 1 ";

  //日期篩選
  let weekly = req.query.weekly || "";
  if (weekly) {
    where += ` AND (NOT FIND_IN_SET(${weekly} , rest_date)OR rest_date IS NULL)`;
  }

  //時間篩選
  let startTime = req.query.startTime || "";
  let endTime = req.query.endTime || "";
  if (startTime && endTime) {
    where += ` AND ((start_at_1 BETWEEN '${startTime}' AND '${endTime}') OR (end_at_1 BETWEEN '${startTime}' AND '${endTime}') OR (start_at_2 BETWEEN '${startTime}' AND '${endTime}') OR (end_at_2 BETWEEN '${startTime}' AND '${endTime}')) `;
  }

  // 關鍵字宣告
  let keyword = req.query.keyword || "";
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    // where += ` AND r.name LIKE ${keyword_escaped} `;
    where += ` AND (r.name LIKE ${keyword_escaped} OR r.city LIKE ${keyword_escaped} OR r.area LIKE ${keyword_escaped}) `;
  }

  // 分類
  let rule = req.query.rule || "";
  let service = req.query.service || "";
  let cityParam = req.query.city || "";
  let area = req.query.area || "";
  let category = req.query.category || "";

  //取得多個用餐類別
  if (category) {
    const categoryValues = category.split(",");
    const validCategoryValues = categoryValues
      .map((value) => dict[value])
      .filter(Boolean);
    if (validCategoryValues.length > 0) {
      const categorySids = validCategoryValues.join(",");
      where += `AND ac.category_sid IN (${categorySids})  `;
    }
  }

  console.log(category);

  if (cityParam) {
    const cityValue = locationDict[cityParam];
    where += ` AND  r.city = '${cityValue}'  `;
  }

  if (area) {
    const areaValue = locationDict[area];
    where += ` AND  r.area = '${areaValue}'  `;
  }

  if (rule) {
    const rule_con = dict[rule];
    //讀取到和rule的sid
    where += ` AND ar.rule_sid = ${rule_con} `;
  }

  if (service) {
    const service_con = dict[service];
    //讀取到和service的sid
    where += ` AND asr.service_sid = ${service_con} `;
  }

  // const perPage=15;
  let perPage = req.query.perPage || 15;
  let page = req.query.page ? parseInt(req.query.page) : 1;
  if (!page || page < 1) {
    page = 1;
  }

  //排序
  let orderBy = req.query.orderBy || "hot_DESC";
  let order = " ORDER BY ";
  const order_escaped = dict[orderBy];
  order += ` ${order_escaped} `;

  //取得總筆數資訊
  // const sql_totalRows = `SELECT COUNT(1) totalRows FROM restaurant_information ${where}`;

  const sql_totalRows = `SELECT COUNT(1) totalRows 
  FROM (
    SELECT r.rest_sid 
    FROM restaurant_information r
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
  JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
  JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
  LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
  JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
  ${where}
  GROUP BY r.rest_sid) AS subquery;`;

  const [[{ totalRows }]] = await db.query(sql_totalRows);
  let totalPages = 0;
  let rows = [];

  //有資料時
  if (totalRows) {
    //取得總頁數
    totalPages = Math.ceil(totalRows / perPage);

    if (page > totalPages) {
      page = totalPages;
    }

    //確定要查詢的頁碼資料比總頁數小，才去拉資料
    const sql = `SELECT
    r.rest_sid,
    r.name,
    r.city,
    r.area,
    GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
    GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
    GROUP_CONCAT(DISTINCT ri.img_name) AS img_names,
    ROUND(AVG(rr.friendly), 1) AS average_friendly,
    COUNT(b.booking_sid) AS booking_count
      FROM
          restaurant_information AS r
      JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
      JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
      JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
      JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
      JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
      LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
      LEFT JOIN restaurant_booking AS b ON r.rest_sid = b.rest_sid
      JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
      ${where}
      GROUP BY
          r.rest_sid,
          r.name,
          r.city,
          r.area
      ${order}
      LIMIT ${perPage * (page - 1)}, ${perPage};`;
    //要插入${order}在group by下面
    [rows] = await db.query(sql);
  }

  if (res.locals.jwtData) {
    const sql_like = `SELECT * FROM restaurant_like where member_sid="${res.locals.jwtData.id}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      rows = rows.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
    }
  }

  output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
  return res.json(output);
});

//取得餐廳種類路由
router.get("/category", async (req, res) => {
  let output = {
    restKind: [],
    restKindhas: [],
  };
  const sql_restKind = `SELECT category_sid, category_name FROM restaurant_category WHERE 1`;

  const [restKind] = await db.query(sql_restKind);

  const sql_restKindhas = `SELECT ra.rest_sid, rc.category_sid, rc.category_name, r.name
  FROM restaurant_associated_category ra
  JOIN restaurant_category rc ON ra.category_sid = rc.category_sid
  JOIN restaurant_information r ON ra.rest_sid = r.rest_sid;`;

  const [restKindhas] = await db.query(sql_restKindhas);
  output = {
    ...output,
    restKind,
    restKindhas,
  };
  return res.json(output);
});

router.get("/restaurant/:rest_sid", async (req, res) => {
  let output = {
    restDetailRows: [],
    imageRows: [],
    ruleRows: [],
    serviceRows: [],
    commentRows: [],
    commentAvgRows: [],
    activityRows: [],
    likeDatas: [],
    menuRows: [],
  };
  const { rest_sid } = req.params;
  console.log(rest_sid);

  const sql_restDetail = `SELECT
  rest_sid,
  name,
  phone,
  city,
  area,
  address,
  acceptType,
  info,
  feature_title,
  feature_content,
  feature_img,
  SUBSTRING(start_at_1, 1, 5) AS start_at_1,
  SUBSTRING(end_at_1, 1, 5) AS end_at_1,
  SUBSTRING(start_at_2, 1, 5) AS start_at_2,
  SUBSTRING(end_at_2, 1, 5) AS end_at_2,
  rest_date
FROM restaurant_information
WHERE rest_sid="${rest_sid}";`;

  let [restDetailRows] = await db.query(sql_restDetail);
  // return res.json(restDetailRows)
  //取得餐廳照片
  const sql_image = `SELECT rest_sid, img_sid, img_name FROM restaurant_img WHERE rest_sid = ${rest_sid}`;
  let [imageRows] = await db.query(sql_image);

  //取得攜帶規則
  const sql_restRule = `SELECT rr.rule_name, rr.rule_icon
    FROM restaurant_rule AS rr
    JOIN restaurant_associated_rule AS ar
    ON rr.rule_sid = ar.rule_sid
    WHERE ar.rest_sid = ${rest_sid};`;

  let [ruleRows] = await db.query(sql_restRule);

  //取得服務項目
  const sql_restService = `SELECT rs.service_name, rs.service_icon
  FROM restaurant_service AS rs
  JOIN restaurant_associated_service AS ras ON rs.service_sid = ras.service_sid
  WHERE ras.rest_sid = ${rest_sid};`;

  let [serviceRows] = await db.query(sql_restService);

  //取得餐廳評分
  const sql_comment = `SELECT 
  m.name,
  m.profile,
  rr.content,
  rr.created_at,
  rr.rest_commtent_id,
  ROUND((rr.environment + rr.food + rr.friendly) / 3) AS avg_rating
  FROM member_info AS m
  JOIN restaurant_rating AS rr ON m.member_sid = rr.member_sid
  WHERE rr.rest_sid = ${rest_sid};`;
  let [commentRows] = await db.query(sql_comment);

  commentRows.forEach((v) => {
    v.created_at = res.toDateString(v.date);
  });

  //取得餐廳評分各項平均
  const sql_avg_comment = `SELECT 
  ROUND(AVG(environment), 1) AS avg_environment,
  ROUND(AVG(food), 1) AS avg_food,
  ROUND(AVG(friendly), 1) AS avg_friendly
  FROM restaurant_rating
  WHERE rest_sid = ${rest_sid};`;

  let [commentAvgRows] = await db.query(sql_avg_comment);
  //取得餐廳活動
  const sql_restActivity = `SELECT rest_sid, act_sid, title, content, img, date FROM restaurant_activity WHERE rest_sid = ${rest_sid};`;

  let [activityRows] = await db.query(sql_restActivity);

  //取得餐廳的菜單
  const sql_menu = `SELECT rest_sid, menu_sid, menu_name FROM restaurant_menu WHERE rest_sid = ${rest_sid};`;

  let [menuRows] = await db.query(sql_menu);

  //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
  const sql_likeList = `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  (SELECT ru.rule_name FROM restaurant_associated_rule AS ar_sub
   JOIN restaurant_rule AS ru ON ar_sub.rule_sid = ru.rule_sid
   WHERE ar_sub.rest_sid = r.rest_sid
   LIMIT 1) AS rule_name,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  (SELECT img_name FROM restaurant_img WHERE rest_sid = r.rest_sid LIMIT 1) AS img_name,
  MAX(rl.date) AS latest_like_date
FROM
  restaurant_information AS r
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
  JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
  JOIN restaurant_like AS rl ON r.rest_sid = rl.rest_sid
WHERE rl.member_sid = 'mem00001'
GROUP BY
  r.rest_sid,
  r.name,
  r.city,
  r.area
ORDER BY
  latest_like_date DESC;
`;
  const [likeDatas] = await db.query(sql_likeList);

  likeDatas.forEach((v) => {
    v.date = res.toDateString(v.date);
  });

  output = {
    ...output,
    restDetailRows,
    imageRows,
    ruleRows,
    serviceRows,
    commentRows,
    commentAvgRows,
    activityRows,
    likeDatas,
    menuRows,
  };
  return res.json(output);
});
//booking路由
router.get("/booking", async (req, res) => {
  const book_sql =
    "SELECT t1.`rest_sid`, t1.`section_sid`, t1.`section_code`, t1.`time`, t2.`name`, t2.`people_max` FROM `restaurant_period of time` t1 JOIN `restaurant_information` t2 ON t1.`rest_sid` = t2.`rest_sid` WHERE t1.`rest_sid` = 4;";
  const [book_info] = await db.query(book_sql);
  return res.json(book_info);
});
//給列表頁餐廳名稱的選項API
router.get("/search-name", async (req, res) => {
  let output = {
    keywords: [],
  };

  let keywords = [];
  let restName = [];
  const sql_rest_names = `SELECT name FROM restaurant_information  WHERE 1;`;
  const [rest_names] = await db.query(sql_rest_names);

  if (rest_names.length > 0) {
    restName = [...rest_names].map((v) => {
      return v.name;
      // return v.name.split("-")[1].split("(")[0];
    });
    restName = [...new Set(restName)];
  }
  keywords = [...restName];

  output = {
    ...output,
    keywords,
  };
  return res.json(output);
});

//處理蒐藏愛心的API
router.post("/handle-like-list", async (req, res) => {
  let output = {
    success: true,
  };
  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }
  const receiveData = req.body.data;

  console.log(receiveData);

  let deleteLike = [];
  let addLike = [];
  //確定該會員有經過jwt認證並且有傳資料過來，才去資料庫讀取資料
  if (member && receiveData.length > 0) {
    const sql_prelike = `SELECT rest_sid FROM restaurant_like WHERE member_sid="${member}"`;
    const [prelike_rows] = await db.query(sql_prelike);
    const preLikeRestaurants = prelike_rows.map((v) => {
      return v.rest_sid;
    });

    //將收到前端的資料與原先該會員收藏列表比對，哪些是要被刪除，哪些是要被增加
    deleteLike = receiveData
      .filter((v) => preLikeRestaurants.includes(v.rest_sid))
      .map((v) => `"${v.rest_sid}"`);
    addLike = receiveData.filter(
      (v) => !preLikeRestaurants.includes(v.rest_sid)
    );
  }

  if (deleteLike.length > 0) {
    const deleteItems = deleteLike.join(", ");
    const sql_delete_like = `DELETE FROM restaurant_like WHERE member_sid="${member}" AND rest_sid IN (${deleteItems})`;
    const [result] = await db.query(sql_delete_like);
    output.success = !!result.affectedRows;
  }

  if (addLike.length > 0) {
    const sql_add_like = ` INSERT INTO restaurant_like(member_sid, rest_sid, date ) VALUES ?`;

    const insertLike = addLike.map((v) => {
      return [member, v.rest_sid, res.toDatetimeString(v.time)];
    });

    const [result] = await db.query(sql_add_like, [insertLike]);
    output.success = !!result.affectedRows;
  }
  res.json(output);
});

//讀取收藏清單API
router.get("/show-like", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  let likeDatas = [];

  if (member) {
    const sql_likeList = `SELECT
    r.rest_sid,
    r.name,
    r.city,
    r.area,
    (SELECT ru.rule_name FROM restaurant_associated_rule AS ar_sub
     JOIN restaurant_rule AS ru ON ar_sub.rule_sid = ru.rule_sid
     WHERE ar_sub.rest_sid = r.rest_sid
     LIMIT 1) AS rule_name,
    GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
    (SELECT img_name FROM restaurant_img WHERE rest_sid = r.rest_sid LIMIT 1) AS img_name,
    MAX(rl.date) AS date
  FROM
    restaurant_information AS r
    JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
    JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
    JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
    JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
    JOIN restaurant_like AS rl ON r.rest_sid = rl.rest_sid
  WHERE rl.member_sid = '${member}'
  GROUP BY
    r.rest_sid,
    r.name,
    r.city,
    r.area
  ORDER BY
    date DESC`;

    [likeDatas] = await db.query(sql_likeList);
    likeDatas.forEach((v) => {
      v.data = res.toDateString(v.date);
    });
  }
  output = {
    ...output,
    likeDatas,
  };
  return res.json(output);
});

//刪除收藏清單的APIjwtData

router.delete("/likelist/:rid", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }
  const { rid } = req.params;
  let sql_deleteLikeList = "DELETE FROM `restaurant_like` WHERE ";

  if (rid === "all") {
    sql_deleteLikeList += `member_sid = '${member}'`;
  } else {
    sql_deleteLikeList += `member_sid = '${member}' AND rest_sid='${rid}'`;
  }

  try {
    const [result] = await db.query(sql_deleteLikeList);
    res.json({ ...result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
});
module.exports = router;
// console.log(JSON.stringify(router, null, 4));
