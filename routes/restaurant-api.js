const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

// router.get("/", async (req, res) => {
//   //卡片取得
//   const sql = `SELECT
//   r.rest_sid,
//   r.name,
//   r.city,
//   r.area,
//   GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
//   GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
//   GROUP_CONCAT(DISTINCT ri.img_name) AS img_names,
//   AVG(rr.friendly) AS average_friendly
//   FROM restaurant_information AS r
//   JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
//   JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
//   JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
//   JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
//   JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
//   LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
//   GROUP BY
//   r.rest_sid,
//   r.name,
//   r.city,
//   r.area;
// `;
//   const [data] = await db.query(sql);
//   res.json(data);
// });

router.get("/list", async (req, res) => {
  let output = {
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  // const dict = {
  //   no_rope: "ar.rule_sid = 6",
  //   free: "ar.rule_sid = 8",
  //   sell_food: "as.service_sid = 3 ",
  //   tableware: "as.service_sid = 4 ",
  //   clean: "as.service_sid = 9",
  //   have_seat: "ar.rule_sid = 4 ",
  //   hot_DESC:'',
  // };


  const dict = {
    no_rope: 6,
    free: 8,
    sell_food: 3 ,
    tableware: 4,
    clean:9,
    have_seat: 4 ,
    taipei:'台北市',
    taichung:'台中市',
    newtaipei:'新北市'
  };

  //queryString條件判斷
  let where = " WHERE 1 ";

  // 關鍵字宣告
  let keyword = req.query.keyword || "";
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    where += ` AND name LIKE ${keyword_escaped} `;
  }

  // 友善分類
  let rule = req.query.rule || "";
  let service =  req.query.service || "";
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

  //order_by
  let orderBy = req.query.orderBy || "hot_DESC";
  //queryString排序判斷
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
            ROUND(AVG(rr.friendly), 1) AS average_friendly
          FROM
            restaurant_information AS r
            JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
            JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
            JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
            JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
            JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
            LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
            ${where}
            GROUP BY
            r.rest_sid,
            r.name,
            r.city,
            r.area
            LIMIT ${perPage * (page - 1)}, ${perPage}
          `;

    //要插入${order}在group by下面
    [rows] = await db.query(sql);

    output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
    return res.json(output);
  }
});

router.get("restaurant/:rest_sid", async (req, res) => {
  const { rest_sid } = req.params;
  const sql_restDetail = `SELECT rest_sid, name, phone, city, area, address, acceptType, info, feature_title, feature_content, feature_img, start_at_1, end_at_1, start_at_2, end_at_2,  rest_date FROM restaurant_information WHERE rest_sid="${rest_sid}";`;
});

module.exports = router;
console.log(JSON.stringify(router, null, 4));
