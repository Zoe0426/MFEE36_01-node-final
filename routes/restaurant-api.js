const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();
const nodemailer = require("nodemailer");

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
  r.average_friendly,
  r.booking_count,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names
    FROM
        restaurant_information AS r
    JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
    JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
    JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
    JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
    JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
    LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
    JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
  WHERE 1
  GROUP BY
    r.rest_sid,
    r.name,
    r.city,
    r.area,
    r.average_friendly,
    r.booking_count
  ORDER BY
    booking_count DESC
    LIMIT 12;`;

  // ORDER BY hot_DESC
  [rows1] = await db.query(sql1);

  const sql2 = `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  r.average_friendly,
  r.booking_count,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names
    FROM
        restaurant_information AS r
    JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
    JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
    JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
    JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
    JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
    LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
    JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
  WHERE 1
  GROUP BY
    r.rest_sid,
    r.name,
    r.city,
    r.area,
    r.average_friendly,
    r.booking_count
  ORDER BY
    average_friendly DESC
    LIMIT 12;`;
  // ORDER BY hot_DESC
  [rows2] = await db.query(sql2);

  //判斷用戶有沒有登入，token驗證，並拉回該會員的收藏
  if (res.locals.jwtData) {
    const sql_like = `SELECT * FROM restaurant_like where member_sid="${res.locals.jwtData.id}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      rows1 = rows1.map((v1) => {
        const foundLike = like_rows.find((v2) => v1.rest_sid === v2.rest_sid);
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
      rows2 = rows2.map((v1) => {
        const foundLike = like_rows.find((v2) => v1.rest_sid === v2.rest_sid);
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
    }
  }
  // console.log(rows1);
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

  // console.log(category);

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
    r.average_friendly,
    r.booking_count,
    GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
    GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
    GROUP_CONCAT(DISTINCT ri.img_name) AS img_names
      FROM
          restaurant_information AS r
      JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
      JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
      JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
      JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
      JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
      LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
      JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
      ${where}
      GROUP BY
          r.rest_sid,
          r.name,
          r.city,
          r.area,
          r.average_friendly,
          r.booking_count,
          r.created_at 
      ${order}
      LIMIT ${perPage * (page - 1)}, ${perPage};`;
    //要插入${order}在group by下面
    [rows] = await db.query(sql);
  }
  //判斷用戶有沒有登入，token驗證，並拉回該會員的收藏
  if (res.locals.jwtData) {
    const sql_like = `SELECT * FROM restaurant_like where member_sid="${res.locals.jwtData.id}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      rows = rows.map((v1) => {
        const foundLike = like_rows.find((v2) => v1.rest_sid === v2.rest_sid);
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
    }
  }
  // console.log(rows);
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
    menuRows: [],
  };
  const { rest_sid } = req.params;
  // console.log(rest_sid);

  const chinesseChange = (rest_date) => {
    if (!rest_date) {
      return "";
    }

    const daysOfWeek = ["一", "二", "三", "四", "五", "六", "日"];
    const restDays = rest_date.split(",").map((day) => parseInt(day));

    return restDays.map((day) => `${daysOfWeek[day - 1]}`).join("/");
  };

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
  average_friendly,
  SUBSTRING(start_at_1, 1, 5) AS start_at_1,
  SUBSTRING(end_at_1, 1, 5) AS end_at_1,
  SUBSTRING(start_at_2, 1, 5) AS start_at_2,
  SUBSTRING(end_at_2, 1, 5) AS end_at_2,
  rest_date
FROM restaurant_information
WHERE rest_sid="${rest_sid}";`;

  let [restDetailRows] = await db.query(sql_restDetail);

  // 處理 rest_date，將其轉換成中文星期
  restDetailRows = restDetailRows.map((row) => {
    const rest_date = row.rest_date;
    row.rest_date = chinesseChange(rest_date);
    return row;
  });

  //將麵包屑中文與前端路由英文的產品類別轉換放置商品主要資訊
  const breadCrumb = `SELECT rac.category_sid, rc.category_name, rc.category_englsih,rac.rest_sid
  FROM restaurant_associated_category AS rac
  JOIN restaurant_category AS rc ON rac.category_sid = rc.category_sid
  WHERE rac.rest_sid = "${rest_sid}"
  ORDER BY rac.category_sid 
  LIMIT 1`;

  let [breadCrumbData] = await db.query(breadCrumb);

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
  // const sql_comment = `SELECT
  // m.name,
  // m.profile,
  // rr.content,
  // rr.created_at,
  // rr.rest_commtent_id,
  // ROUND((rr.environment + rr.food + rr.friendly) / 3) AS avg_rating
  // FROM member_info AS m
  // JOIN restaurant_rating AS rr ON m.member_sid = rr.member_sid
  // WHERE rr.rest_sid = ${rest_sid};`;
  const sql_comment = `SELECT 
  m.name,
  m.profile,
  rr.content,
  rr.created_at,
  rr.rest_commtent_id,
  rr.friendly AS avg_rating
FROM member_info AS m
JOIN restaurant_rating AS rr ON m.member_sid = rr.member_sid
WHERE rr.rest_sid = ${rest_sid};`;

  let [commentRows] = await db.query(sql_comment);

  commentRows.forEach((v) => {
    v.created_at = res.toDateString(v.created_at);
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

  //判斷用戶有沒有登入，用token驗證，並確認該產品有沒有收藏
  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  if (member) {
    const sql_like = `SELECT * FROM restaurant_like where member_sid="${res.locals.jwtData.id}" AND rest_sid="${rest_sid}" `;
    const [like_rows] = await db.query(sql_like);
    restDetailRows =
      like_rows.length > 0
        ? [{ ...restDetailRows[0], like: true }]
        : [{ ...restDetailRows[0], like: false }];
  }

  output = {
    ...output,
    restDetailRows,
    imageRows,
    ruleRows,
    serviceRows,
    commentRows,
    commentAvgRows,
    activityRows,
    menuRows,
    breadCrumbData,
  };
  return res.json(output);
});

//booking預約頁面路由
router.get("/booking", async (req, res) => {
  let output = {
    bookingRows: [],
    memberRows: [],
  };
  const book_sql =
    "SELECT t1.`rest_sid`, t1.`section_code`, t1.`time`, t1.`date`, t2.`name`, t2.`city`, t2.`people_max` - IFNULL(SUM(rb.`people_num`), 0) AS `remaining_slots` FROM `restaurant_period_of_time` t1 JOIN `restaurant_information` t2 ON t1.`rest_sid` = t2.`rest_sid` LEFT JOIN `restaurant_booking` rb ON t1.`rest_sid` = rb.`rest_sid` AND t1.`section_code` = rb.`section_code` WHERE t1.`rest_sid` = 4 GROUP BY t1.`rest_sid`, t1.`section_code`, t1.`time`, t1.`date`, t2.`name`, t2.`people_max`,t2.`city`;";

  [bookingRows] = await db.query(book_sql);
  bookingRows.forEach((v) => {
    const date = new Date(v.date);
    // Set the year to a fixed value (e.g., 2000)
    date.setFullYear(2000);
    // Format the date as "MM/dd (Day, Weekday)"
    v.date = `${date.getMonth() + 1}/${date.getDate()} (${
      ["日", "一", "二", "三", "四", "五", "六"][date.getDay()]
    })`;
  });

  const member_aql =
    "SELECT `member_sid`, `name`, `mobile` FROM `member_info` WHERE `member_sid`='mem00300'";
  [memberRows] = await db.query(member_aql);

  output = {
    ...output,
    bookingRows,
    memberRows,
  };
  return res.json(output);
});
router.get("/calendar", async (req, res) => {
  let output = {
    bookingRows: [],
    memberRows: [],
  };
  const book_sql =
    "SELECT t1.`rest_sid`, t1.`section_code`, t1.`time`, t1.`date`, t2.`name`, t2.`city`, t2.`people_max` - IFNULL(SUM(rb.`people_num`), 0) AS `remaining_slots` FROM `restaurant_period_of_time` t1 JOIN `restaurant_information` t2 ON t1.`rest_sid` = t2.`rest_sid` LEFT JOIN `restaurant_booking` rb ON t1.`rest_sid` = rb.`rest_sid` AND t1.`section_code` = rb.`section_code` WHERE t1.`rest_sid` = 4 GROUP BY t1.`rest_sid`, t1.`section_code`, t1.`time`, t1.`date`, t2.`name`, t2.`people_max`,t2.`city`;";

  [bookingRows] = await db.query(book_sql);
  bookingRows.forEach((v) => {
    const date = new Date(v.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    v.date = `${year}-${month}-${day}`;
  });

  const member_aql =
    "SELECT `member_sid`, `name`, `mobile` FROM `member_info` WHERE `member_sid`='mem00300'";
  [memberRows] = await db.query(member_aql);

  output = {
    ...output,
    bookingRows,
    memberRows,
  };
  return res.json(output);
});

// 寄預約通知
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// booking insert
router.post("/booking_modal", multipartParser, async (req, res) => {
  let output = {
    success: true,
  };

  const {
    rest_sid,
    section_code,
    date,
    member_sid,
    people_num,
    pet_num,
    note,
    rest_name,
    member_name,
    member_mobile,
    date_time,
  } = req.body;

  const book_action = `INSERT INTO restaurant_booking(rest_sid,section_code, date, member_sid, people_num, pet_num, note, created_at) VALUES (?,?,?,?,?,?,?,NOW())`;

  // console.log(
  //   db.format(book_action, [
  //     rest_sid,
  //     section_code,
  //     date,
  //     member_sid,
  //     people_num,
  //     pet_num,
  //     note,
  //   ])
  // );

  try {
    await db.query(book_action, [
      rest_sid,
      section_code,
      date,
      member_sid,
      people_num,
      pet_num,
      note,
    ]);

    const mailOptions = {
      from: "gowithmeispan@gmail.com",
      to: "jillwunnie1213@gmail.com", // 接收郵件的地址
      subject: "狗with咪_餐廳預約通知",
      html: `<pre>
<h2>您已成功預約餐廳!🎉</h2>
<p style="font-size:18px; display:inline; font-weight:bold">預約明細</p>
----------------------------------
<div style="color:black; font-size:16px; display:inline;">
餐廳名稱：${rest_name}</br>
會員名稱：${member_name}</br>
會員電話：${member_mobile}</br>
預約日期：${date}</br>
預約時間：${date_time}</br>
預約人數：${people_num}人</br>
預約寵物：${pet_num}隻</br>
備註：${note}</br>
</div>
----------------------------------
<p style="color:red; font-size:18px; display:inline;">您的訂位將保留15分鐘~</p>
</pre>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    return res.json(output);
  } catch (error) {
    console.error(error);
    output.success = false;
    return res.json(output);
  }
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

  // console.log(receiveData);

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
      v.date = res.toDateString(v.date);
    });
  }
  // console.log(likeDatas);
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

//製作評價假資料...
router.get("/create-comment", async (req, res) => {
  const booking_data =
    "SELECT `rest_sid`, `booking_sid`, `section_code`, `date`, `member_sid`, `people_num`, `pet_num`, `note`, `created_at` FROM `restaurant_booking` WHERE 1";

  const [booking] = await db.query(booking_data);
  const selectIndex = Math.floor(Math.random() * 15);

  for (const v of booking) {
    const selectIndex = Math.floor(Math.random() * 15);
    const comment = [
      "這間餐廳真的超級適合帶寵物，環境寬敞舒適，讓毛小孩也能享受美味的用餐體驗！工作人員對寵物超友善，下次還會再來",
      "餐廳的寵物政策很人性化，可以陪伴毛寶貝一起用餐，真的是個很溫暖的地方。食物味道也相當好，很推薦給有寵物的家庭",
      "我們帶著愛犬來到這家餐廳，感受到了真摯的寵物友善，餐廳提供了寵物用具與水源，讓我們的小狗也能玩得很開心！",
      "太愛這家餐廳了！不僅食物美味，環境舒適，還可以和愛狗一起來用餐。這裡真的是寵物友善的天堂，我們家狗狗很喜歡",
      "這裡不僅有美食，還有可愛的寵物陪伴。餐廳的寵物區很乾淨整潔，工作人員也非常細心照顧我們的寵物，讓我們感到很放心",
      "第一次帶我家貓咪出門用餐，這家餐廳的寵物友善政策真的讓我們感到很驚喜。貓咪非常享受這個新經驗，我們也玩得很開心",
      "寵物友善的餐廳真的是太難得了！這裡的服務讓人感到賓至如歸，我們的愛狗也很快樂。下次再來，還要帶更多寵物朋友",
      "終於找到一家可以和愛狗一起用餐的餐廳！這裡的食物超級好吃，環境也很舒適，最棒的是可以與愛狗一同分享美好時光",
      "我們一家人加上愛狗一起來用餐，這裡的寵物區非常貼心，提供了舒適的環境與玩具，讓愛狗也能玩得很開心。真的是很棒的體驗",
      "來到這家寵物友善餐廳，讓我們的貓咪第一次感受到了用餐的樂趣。這裡真的是貓咪的天堂，吃飯的同時也能一起和貓咪互動，太幸福了",
      "這裡是寵物的天堂，我們帶著愛貓來用餐，餐廳提供了專屬的貓咪用具，讓我們的貓咪也能融入用餐的氛圍，是個非常愉快的用餐體驗",
      "寵物友善餐廳真的讓我們的用餐時光更加幸福。環境很寬敞舒適，有專屬的寵物區域，愛狗也能和我們一起用餐，是個難得的用餐選擇",
      "我們家的狗狗非常喜歡這家餐廳，他在這裡有專屬的區域可以玩耍，工作人員也很貼心，讓我們的用餐體驗更加愉快。這裡真的是寵物友善的好地方",
      "有寵物的家庭一定不能錯過這家餐廳！我們帶著愛犬來用餐，餐廳提供了寵物用具，服務人員也很照顧我們的愛狗，讓我們的用餐時光更加溫馨愉快",
      "這家餐廳真的是寵物友善的天堂！我帶著愛犬來用餐，餐廳提供了專屬的寵物區域，有寵物用具和玩具，讓我的愛犬也能玩得很開心",
    ];

    const create_member = `mem00${Math.ceil(Math.random() * 500)
      .toString()
      .padStart(3, "0")}`;

    const environment = Math.floor(Math.random() * 3) + 3;
    const food = Math.floor(Math.random() * 3) + 3;
    const friendly = Math.floor(Math.random() * 3) + 3;

    const startDate = new Date("2023-01-01").getTime();
    const endDate = new Date("2023-07-25").getTime();
    const randomDate = res.toDatetimeString(
      Math.random() * (endDate - startDate) + startDate
    );

    const sql =
      "INSERT INTO `restaurant_rating`( `rest_sid`, `member_sid`, `environment`, `food`, `friendly`, `content`, `booking_sid`, `created_at`) VALUES (?,?,?,?,?,?,?,?)";

    const [result] = await db.query(sql, [
      v.rest_sid,
      create_member,
      environment,
      food,
      friendly,
      comment[selectIndex],
      v.booking_sid,
      randomDate,
    ]);
  }
  res.json(selectIndex);
});

// router.get("/send-email", async (req, res) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 465,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });

//     const info = await transporter.sendMail({
//       from: "gowithmeispan@gmail.com",
//       to: "接收郵件地址",
//       subject: "狗with咪_餐廳預約通知",
//       html: body,
//     });

//     // console.log({ info });
//     res.status(200).send("郵件發送成功！");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("發送郵件時出錯。");
//   }
// });
module.exports = router;
// console.log(JSON.stringify(router, null, 4));
