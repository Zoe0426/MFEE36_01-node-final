const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

router.get("/", async (req, res) => {
  //卡片取得
  const sql = `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names,
  AVG(rr.friendly) AS average_friendly
FROM
  restaurant_information AS r
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
  JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
  JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
  LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
GROUP BY
  r.rest_sid,
  r.name,
  r.city,
  r.area;
`;
  const [data] = await db.query(sql);
  res.json(data);
});

router.get("/restaurants/list", async (req, res) => {
  let output = {
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  // const perPage=15;
  let perPage = req.query.perPage || 15;
  if (!page || page < 1) {
    page = 1;
  }

  //queryString條件判斷
  let where = " WHERE 1 ";

  let order = " ORDER BY ";
  const order_escaped = dict[orderBy];
  order += ` ${order_escaped} `;

  //取得總筆數資訊
  const sql_totalRows = `SELECT COUNT(1) totalRows FROM restaurant_information ${where}`;
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
            AVG(rr.friendly) AS average_friendly
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

    const [rows] = await db.query(sql);

    output = { ...output, totalRows, perPage, totalPages, page, rows };
    return res.json(output);
  }
});

router.get("restaurant/:rest_sid", async (req, res) => {
  const { rest_sid } = req.params;
  const sql_restDetail = `SELECT rest_sid, name, phone, city, area, address, acceptType, info, feature_title, feature_content, feature_img, start_at_1, end_at_1, start_at_2, end_at_2,  rest_date FROM restaurant_information WHERE rest_sid="${rest_sid}";`;
});

module.exports = router;
console.log(JSON.stringify(router, null, 4));
