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
    taipei: "台北市",
    taichung: "台中市",
    newtaipei: "新北市",
    hot_DESC: "booking_count DESC",
    new_DESC: "r.created_at DESC",
    cmt_DESC: "average_friendly DESC",
  };

  //queryString條件判斷
  let where = " WHERE 1 ";

  //排序

  // 關鍵字宣告
  let keyword = req.query.keyword || "";
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    where += ` AND r.name LIKE ${keyword_escaped} `;
  }

  // 友善分類
  let rule = req.query.rule || "";
  let service = req.query.service || "";
  let cityParam = req.query.city || "";

  if (cityParam) {
    const cityValue = dict[cityParam];
    where += ` AND  r.city = '${cityValue}'  `;
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

  console.log(order_escaped);

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
  ${where}
    GROUP BY r.rest_sid 
  ) AS subquery;`;

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
    ${where}
    GROUP BY
    r.rest_sid,
    r.name,
    r.city,
    r.area
    ${order}
    LIMIT ${perPage * (page - 1)}, ${perPage}
    `;

    //要插入${order}在group by下面
    [rows] = await db.query(sql);
  }
  output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
  return res.json(output);
});

router.get("/restaurant/:rest_sid", async (req, res) => {
  const { rest_sid } = req.params;
  console.log(rest_sid)

  const sql_restDetail = `SELECT rest_sid, name, phone, city, area, address, acceptType, info, feature_title, feature_content, feature_img, start_at_1, end_at_1, start_at_2, end_at_2,  rest_date FROM restaurant_information WHERE rest_sid="${rest_sid}";`;

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
  const sql_comment = `SELECT ROUND(AVG(friendly), 1) AS avg_friendly FROM restaurant_rating WHERE rest_sid =  ${rest_sid};`;
  let [commentRows] = await db.query(sql_comment);

  //3.將上述資訊結合成預設資訊
  // const defaultObj = {
  //   rest_sid: "00",
  //   rest_sid: rest_sid,
  //   name: "default",
  //   qty: 0,
  //   img: mainImg,
  //   for_age: 0,
  // };
  res.json({
    restDetailRows,
    imageRows,
    ruleRows,
    serviceRows,
    commentRows,
  });
});

module.exports = router;
// console.log(JSON.stringify(router, null, 4));
