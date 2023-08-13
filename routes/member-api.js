const express = require("express");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();
const { OAuth2Client } = require("google-auth-library");

// 登入
router.post("/login", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
  };
  if (!req.body.email || !req.body.password) {
    output.error = "欄位資料不足";
    return res.json(output);
  }
  const sql = "SELECT * FROM member_info WHERE email=?";
  const [rows] = await db.query(sql, [req.body.email]);
  if (!rows.length) {
    // 帳號是錯的
    output.code = 402;
    output.error = "帳號或密碼錯誤";
    return res.json(output);
  }
  const verified = await bcrypt.compare(req.body.password, rows[0].password);
  if (!verified) {
    // 密碼是錯的
    output.code = 406;
    output.error = "帳號或密碼錯誤";
    return res.json(output);
  }
  output.success = true;

  // 包 jwt 傳給前端
  const token = jwt.sign(
    {
      id: rows[0].member_sid,
      email: rows[0].email,
    },
    "GoWithMe"
  );
  output.token = token;
  output.data = {
    id: rows[0].member_sid,
    email: rows[0].email,
    nickname: rows[0].nickname,
    profile: rows[0].profile,
    token,
  };

  res.json(output);
});

// google登入
router.post("/googleLogin", async (req, res) => {
  const output = {
    success: true,
    code: 0,
    error: "",
  };

  const CLIENT_ID = "157368154764-abg5711auh3c254hcqfqu4sg1iv1gd3n.apps.googleusercontent.com";
  const client = new OAuth2Client(CLIENT_ID);
  const googleToken = req.body.id_token;

  //將token和client_Id放入參數一起去做驗證
  const ticket = await client.verifyIdToken({
    idToken: googleToken,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const googleEmail = payload.email;

  //拿到的ticket就是換回來的使用者資料
  console.log(ticket);

  //判斷email是否有註冊過
  const sqlEmail = `SELECT * FROM member_info WHERE email="${googleEmail}"`;
  const [rowsEnail] = await db.query(sqlEmail, [googleEmail]);
  if (rowsEnail.length) {
    // 包 jwt 傳給前端
    const token = jwt.sign(
      {
        id: rowsEnail[0].member_sid,
        email: rowsEnail[0].email,
      },
      "GoWithMe"
    );
    output.token = token;
    output.data = {
      id: rowsEnail[0].member_sid,
      email: rowsEnail[0].email,
      nickname: rowsEnail[0].nickname,
      profile: rowsEnail[0].profile,
      token,
    };
  } else {
    //以下就個人需求看要拿資料做哪些使用
    //ex 使用者資訊存入資料庫，把資料存到 session內 等等
    const sql = `INSERT INTO member_info(
    member_sid, name, email, 
    password, mobile, gender, 
    birthday, pet, level, 
    member_ID, profile, 
    game_pet, nickname,
    create_time, update_time) VALUES(
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?,?,
    ?,?,
    NOW(), NOW()
  )`;

    let sql_memSid = `SELECT MAX(member_sid) AS maxSid FROM member_info`;
    let [result_memSid] = await db.query(sql_memSid);
    // res.json(result_memSid);

    let new_memSid = "";
    if (!result_memSid[0].maxSid) {
      new_memSid = "mem00001";
    } else {
      let currentCount = parseInt(result_memSid[0].maxSid.substring(3));
      let newCount = currentCount + 1;
      new_memSid = `mem${String(newCount).padStart(5, "0")}`;
    }

    // 自動生成會員ID
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
    let member_ID = req.body.member_ID || "";

    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      member_ID += chars[randomIndex];
    }

    const [result] = await db.query(sql, [
      new_memSid,
      payload.name,
      payload.email,
      null,
      "",
      null,
      null,
      "狗",
      "銅牌",
      member_ID,
      "default-dog.jpg",
      "狗",
      payload.name,
    ]);

    const [rows] = await db.query(`
  SELECT 
  mo.member_sid as memberSid,
  mo.name as name, 
  mo.email as email, 
  mo.mobile as mobile, 
  mo.gender as gender, 
  mo.birthday as birthday, 
  mo.pet as pet, 
  mo.level as level,
  mo.profile as profile 

  FROM member_info mo 
  WHERE mo.member_sid='${new_memSid}'
  `);

    // 包 jwt 傳給前端
    const token = jwt.sign(
      {
        id: rows[0].memberSid,
        email: rows[0].email,
      },
      "GoWithMe"
    );
    output.token = token;
    output.data = {
      id: rows[0].memberSid,
      email: rows[0].email,
      nickname: rows[0].nickname,
      profile: rows[0].profile,
      token,
    };
  }

  res.json(output);
});

// 讀取單筆會員資料
router.get("/edit", async (req, res) => {
  //let { sid } = req.params;

  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  console.log(res.locals);

  const sid = res.locals.jwtData.id;
  console.log("sid", sid);

  const [rows] = await db.query(`
  SELECT 
  mo.member_sid as memberSid,
  mo.name as name, 
  mo.email as email, 
  mo.mobile as mobile, 
  mo.gender as gender, 
  mo.birthday as birthday, 
  mo.pet as pet, 
  mo.level as level,
  mo.profile as profile 

  FROM member_info mo 
  WHERE mo.member_sid='${sid}'
  `);

  if (rows[0]) {
    const { birthday } = rows[0];
    if (birthday) {
      // 將 birthday 解析为 UTC，然後转换为 Taipei 时间
      let tzBirthday = dayjs.utc(birthday).tz("Asia/Taipei");
      // 格式化日期，忽略时间部分
      rows[0].birthday = tzBirthday.format("YYYY-MM-DD");
    }
  }
  res.json(rows);
  console.log("rows", rows);
});

// router.get("/", async (req, res) => {
//   const [rows] = await db.query(`SELECT * FROM member_info`);
//   res.json(rows);
// });

// --------------------------------------------
// 新增會員資料

/*
1. sql insert
3. member_sid auto creat mem+00000
4. birth dayjs
5. pwd gensalt
6. level 預設銅牌
7. nickname 預設姓名
8. game_pet 根據寵物選擇(狗貓 其他隨機)
9. ID 預設英數random
*/

router.post("/", async (req, res) => {
  const output = {
    success: true,
    code: 0,
    error: "",
  };

  const sqlEmail = "SELECT * FROM member_info WHERE email=?";
  const [rows] = await db.query(sqlEmail, [req.body.email]);
  if (rows.length) {
    // 帳號是錯的
    output.success = false;
    output.code = 402;
    output.error = "帳號或密碼錯誤";
    return res.json(output);
  }

  //  member-info
  const sql = `INSERT INTO member_info(
    member_sid, name, email, 
    password, mobile, gender, 
    birthday, pet, level, 
    member_ID, profile, 
    game_pet, nickname,
    create_time, update_time) VALUES(
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?,?,
    ?,?,
    NOW(), NOW()
  )`;

  // member-address
  const sql2 = `INSERT INTO member_address(
    member_sid, recipient, recipient_phone, 
    post_type, store_name, default_status, 
    city, area, address, 
    create_time, update_time) VALUES (
      ?,?,?,
      ?,?,?,
      ?,?,?,
      NOW(),NOW()
  )`;

  //自動生成會員編號
  // let count = 1;
  // let str = String(count).padStart(5, "0");
  // let memSid = `mem${str}`;
  // console.log(memSid);
  // count++;

  let sql_memSid = `SELECT MAX(member_sid) AS maxSid FROM member_info`;
  let [result_memSid] = await db.query(sql_memSid);
  // res.json(result_memSid);

  let new_memSid = "";
  if (!result_memSid[0].maxSid) {
    new_memSid = "mem00001";
  } else {
    let currentCount = parseInt(result_memSid[0].maxSid.substring(3));
    let newCount = currentCount + 1;
    new_memSid = `mem${String(newCount).padStart(5, "0")}`;
  }

  // 處理生日格式
  let birthday = dayjs(req.body.birthday);
  if (birthday.isValid()) {
    birthday = birthday.format("YYYY-MM-DD");
  } else {
    birthday = null;
  }

  // 自動生成會員ID
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  let member_ID = req.body.member_ID || "";

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    member_ID += chars[randomIndex];
  }

  console.log(member_ID);

  // default profile
  let profile = "";
  switch (req.body.pet) {
    case "狗":
      profile = "default-dog.jpg";
      break;
    case "貓":
      profile = "default-cat.jpg";
      break;
    case "狗貓":
      profile = Math.floor(Math.random() * 2) === 1 ? "default-dog.jpg" : "default-cat.jpg";
      break;
    case "其他":
      profile = Math.floor(Math.random() * 2) === 1 ? "default-dog.jpg" : "default-cat.jpg";
      break;
  }

  // 遊戲寵物
  // let pet = req.body.pet;
  let game_pet = "";
  switch (req.body.pet) {
    case "狗":
      game_pet = "狗";
      break;
    case "貓":
      game_pet = "貓";
      break;
    case "狗貓":
      game_pet = Math.floor(Math.random() * 2) === 1 ? "狗" : "貓";
      break;
    case "其他":
      game_pet = Math.floor(Math.random() * 2) === 1 ? "狗" : "貓";
      break;
  }

  console.log(game_pet);
  console.log(req.body.gender);
  console.log(req.body.pet);

  // 密碼加鹽;
  const saltRounds = 10;
  let saltPwd = await bcrypt.hash(req.body.password, saltRounds);
  console.log(saltPwd);

  const [result] = await db.query(sql, [
    new_memSid,
    req.body.name,
    req.body.email,
    saltPwd,
    req.body.mobile,
    req.body.gender,
    birthday,
    req.body.pet,
    "銅牌",
    member_ID,
    profile,
    game_pet,
    req.body.name,
  ]);

  const [result2] = await db.query(sql2, [
    new_memSid,
    req.body.name,
    req.body.mobile,
    1,
    null,
    1,
    req.body.city,
    req.body.area,
    req.body.address,
  ]);

  res.json({
    result,
    result2,
    postData: req.body,
  });
});
module.exports = router;

// -----------------------------------
// 修改會員資料
router.put("/updateInfo", upload.single("avatar"), async (req, res) => {
  //let { sid } = req.params;

  console.log(req.body);
  console.log(req.file);
  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const sql = `UPDATE member_info SET
  name=?,
  mobile=?,
  profile=?,
  email=?,
  birthday=?,
  gender=?,
  pet=?

  WHERE member_sid='${sid}'`;

  // 處理生日格式
  // ...

  // 處理生日格式
  let birthday = dayjs(req.body.birthday);
  if (birthday.isValid()) {
    birthday = birthday.format("YYYY-MM-DD"); // 將日期轉換成 YYYY-MM-DD 格式存入資料庫
  } else {
    birthday = null;
  }

  console.log(birthday);
  console.log("file", req.file.filename);
  const [result] = await db.query(sql, [
    req.body.name,
    req.body.mobile,
    req.file.filename,
    req.body.email,
    birthday,
    req.body.gender,
    req.body.pet,
  ]);
  const [rows] = await db.query(`
  SELECT 
  mo.member_sid as memberSid,
  mo.name as name, 
  mo.email as email, 
  mo.mobile as mobile, 
  mo.gender as gender, 
  mo.birthday as birthday, 
  mo.pet as pet, 
  mo.level as level,
  mo.profile as profile 

  FROM member_info mo 
  WHERE mo.member_sid='${sid}'
  `);

  if (rows[0]) {
    const { birthday } = rows[0];
    if (birthday) {
      // 將 birthday 解析为 UTC，然後转换为 Taipei 时间
      let tzBirthday = dayjs.utc(birthday).tz("Asia/Taipei");
      // 格式化日期，忽略时间部分
      rows[0].birthday = tzBirthday.format("YYYY-MM-DD");
    }
  }

  console.log("-482", rows);
  res.json(rows);
});

// 抓取會員優惠券
router.get("/coupon", async (req, res) => {
  // let { sid } = req.params;
  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const [rows] = await db.query(`
  SELECT * FROM member_coupon_send 
  INNER JOIN member_coupon_category 
  ON member_coupon_send.coupon_sid = member_coupon_category.coupon_sid 
  WHERE member_sid='${sid}'
  ORDER BY member_coupon_category.price DESC;
  `);

  // Processing all the rows and converting the 'exp_date' into 'YYYY-MM-DD' format
  rows.forEach((row) => {
    let expire = dayjs(row.exp_date);
    if (expire.isValid()) {
      row.exp_date = expire.format("YYYY-MM-DD");
    } else {
      row.exp_date = null;
    }
  });

  res.json(rows);
});

// 抓取訂單
router.get("/order", async (req, res) => {
  //let { sid } = req.params;
  let keywordS = req.query.keywordS || "";
  console.log({ keywordS });
  let keywordA = req.query.keywordA || "";

  let whereS = "";
  if (keywordS) {
    const kw_escaped = db.escape("%" + keywordS + "%");
    whereS += ` AND ( 
      od.rel_name LIKE ${kw_escaped} 
      OR
      od.order_sid LIKE ${kw_escaped}
      )
    `;
  }
  let whereA = "";
  if (keywordA) {
    const kw_escaped = db.escape("%" + keywordA + "%");
    whereA += ` AND ( 
      od.rel_name LIKE ${kw_escaped} 
      OR
      od.order_sid LIKE ${kw_escaped}
      )
    `;
  }

  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const [rows] = await db.query(`
  SELECT *, o.rel_subtotal orderRelS, od.rel_subtotal,
  (SELECT COUNT(1) FROM order_details od  WHERE o.order_sid = od.order_sid) as order_product
FROM order_main o 
JOIN order_details od 
ON o.order_sid = od.order_sid 
JOIN member_coupon_send ms 
ON o.coupon_send_sid = ms.coupon_send_sid
JOIN member_coupon_category mc 
ON mc.coupon_sid = ms.coupon_sid
JOIN shop_product sp
ON sp.product_sid = od.rel_sid    
WHERE o.member_sid = '${sid}' ${whereS}
ORDER BY o.create_dt DESC
  `);

  const [rows2] = await db.query(`
  SELECT *, o.rel_subtotal orderRelS, od.rel_subtotal,
  (SELECT COUNT(1) FROM order_details od  WHERE o.order_sid = od.order_sid) as order_product
FROM order_main o 
JOIN order_details od 
ON o.order_sid = od.order_sid
JOIN member_coupon_send ms 
ON o.coupon_send_sid = ms.coupon_send_sid
JOIN member_coupon_category mc 
ON mc.coupon_sid = ms.coupon_sid 
JOIN activity_info af
ON af.activity_sid = od.rel_sid  
JOIN activity_group ag
ON ag.activity_group_sid = od.rel_seq_sid  
WHERE o.member_sid = '${sid}' ${whereA}
ORDER BY o.create_dt DESC
  `);

  //合併成一個datas
  const datas = rows.concat(rows2);

  //整理datas
  const updatedDatas = datas.map((i) => {
    //整理日期
    let orderCreate = dayjs(i.create_dt);
    if (orderCreate.isValid()) {
      orderCreate = orderCreate.format("YYYY-MM-DD HH:ss");
    } else {
      orderCreate = null;
    }

    //整理期限日期
    let orderExpire = dayjs(orderCreate).add(2, "day").format("YYYY-MM-DD HH:ss");

    return {
      order_sid: i.order_sid,
      post_status: i.post_status,
      rel_name: i.rel_name,
      rel_seq_name: i.rel_seq_name,
      product_qty: i.product_qty,
      adult_qty: i.adult_qty,
      child_qty: i.child_qty,
      orderRelS: i.orderRelS + i.post_amount - i.price,
      post_price: i.post_amount,
      price: i.price,
      img: i.img,
      activity_pic: i.activity_pic ? i.activity_pic.split(",")[0] : "",
      order_product: i.order_product,
      rel_type: i.rel_type,
      city: i.city,
      area: i.area,
      address: i.address,
      actAddress: i.city + i.area + i.address,
      orderStatus: i.order_status,
      createDt: orderCreate,
      orderExpire: orderExpire,
    };
  });

  // 分组
  const groupedData = updatedDatas.reduce((acc, cur) => {
    acc[cur.order_sid] = acc[cur.order_sid] ? [...acc[cur.order_sid], cur] : [cur];
    return acc;
  }, {});

  // 取出每组的第一项
  const firstItems = Object.values(groupedData).map((items) => items[0]);

  res.json(firstItems);
});

// 詳細訂單---------------------------------
router.get("/orderdetail/:sid", async (req, res) => {
  let { sid } = req.params;

  //商品訂單
  const [rows] = await db.query(`
  SELECT *, o.rel_subtotal orderRelS, od.rel_subtotal, mi.name, mi.mobile
  FROM order_main o 
  JOIN member_info mi ON o.member_sid = mi.member_sid 
  JOIN order_details od ON o.order_sid = od.order_sid 
  JOIN member_coupon_send ms ON o.coupon_send_sid = ms.coupon_send_sid 
  JOIN member_coupon_category mc ON mc.coupon_sid = ms.coupon_sid 
  JOIN shop_product sp ON sp.product_sid = od.rel_sid 
  WHERE od.order_sid = '${sid}' 
  ORDER BY o.create_dt DESC;
  `);

  //活動訂單
  const [rows2] = await db.query(`
  SELECT *, o.rel_subtotal orderRelS, od.rel_subtotal, mi.name, mi.mobile, af.address actInfoAddress
  FROM order_main o 
  JOIN member_info mi ON o.member_sid = mi.member_sid 
  JOIN order_details od ON o.order_sid = od.order_sid 
  JOIN member_coupon_send ms ON o.coupon_send_sid = ms.coupon_send_sid 
  JOIN member_coupon_category mc ON mc.coupon_sid = ms.coupon_sid 
  JOIN activity_info af ON af.activity_sid = od.rel_sid 
  JOIN activity_group ag ON ag.activity_group_sid = od.rel_seq_sid 
  WHERE od.order_sid = '${sid}' 
  ORDER BY o.create_dt DESC;
  `);

  //商品評價
  const [rows3] = await db.query(
    `SELECT od.order_detail_sid, od.order_sid, sc.rating shopStar, sc.product_comment_sid, sc.content shopContent
    FROM order_details od
    JOIN shop_comment sc ON sc.order_detail_sid = od.order_detail_sid
    WHERE od.order_sid='${sid}'
  `
  );

  //活動評價
  const [rows4] = await db.query(
    `SELECT od.order_detail_sid, od.order_sid, ar.activity_rating_sid, ar.star actStar, ar.content actContent
    FROM order_details od
    JOIN activity_rating ar ON ar.order_detail_sid = od.order_detail_sid
    WHERE od.order_sid='${sid}'
  `
  );

  //合併成一個datas
  const orderDatas = rows.concat(rows2);
  const reviewData = rows3.concat(rows4);

  let array1 = orderDatas;
  let array2 = reviewData;

  let result = array1.map((item1) => {
    // find object in array1 which has the same order_detail_sid as in item2
    let item2 = array2.find((item) => item.order_detail_sid === item1.order_detail_sid);

    if (item2) {
      // if it exists, then merge both items
      return { ...item1, ...item2 };
    } else {
      return {
        ...item1,
        //order_sid: null,
        product_comment_sid: null,
        shopStar: null,
        shopContent: null,
        activity_rating_sid: null,
        actStar: null,
        actContent: null,
      };
    }
  });

  //整理datas
  const updatedDatas = result.map((i) => {
    let orderCreate = dayjs(i.create_dt);
    if (orderCreate.isValid()) {
      orderCreate = orderCreate.format("YYYY-MM-DD HH:ss");
    } else {
      orderCreate = null;
    }

    return {
      order_detail_sid: i.order_detail_sid,
      member_sid: i.member_sid,
      activity_sid: i.activity_sid,
      member_name: i.name,
      member_mobile: i.mobile,
      order_sid: i.order_sid,
      product_sid: i.product_sid,
      post_status: i.post_status,
      rel_name: i.rel_name,
      rel_seq_name: i.rel_seq_name,
      product_qty: i.product_qty,
      product_price: i.product_price,
      rel_subtotal: i.rel_subtotal,
      adult_qty: i.adult_qty,
      adult_price: i.adult_price,
      child_qty: i.child_qty,
      child_price: i.child_price,
      originRelS: i.orderRelS,
      orderRelS: i.orderRelS + i.post_amount - i.price,
      post_price: i.post_amount,
      coupon_price: i.price,
      img: i.img,
      activity_pic: i.activity_pic ? i.activity_pic.split(",")[0] : "",
      order_product: i.order_product,
      rel_type: i.rel_type,
      post_type: i.post_type,
      tread_type: i.tread_type,
      order_create_time: orderCreate,
      actAddress: i.actInfoAddress,
      postAddress: i.post_address,
      postStore: i.post_store_name,
      prodCommentSid: i.product_comment_sid,
      shopStar: i.shopStar,
      shopContent: i.shopContent,
      actCommentSid: i.activity_rating_sid,
      actStar: i.actStar,
      actContent: i.actContent,
      pcSid: i.product_comment_sid,
      acRaSid: i.activity_rating_sid,
    };
  });

  res.json(updatedDatas);
});

//新增活動評價
router.post("/actReviews", async (req, res) => {
  const sqlAct = `INSERT INTO activity_rating(
  member_sid, activity_sid, order_detail_sid, 
  star, date, content
  ) 
  VALUES (
    ?,?,?,
    ?,NOW(),?)`;

  const actSid = req.body.actSid;

  const [rowsAct] = await db.query(sqlAct, [
    req.body.memberSid,
    actSid,
    req.body.odSid,
    req.body.actStar,
    req.body.actContent,
  ]);

  const sqlUpdateOrderMain = `UPDATE order_main om
  JOIN order_details od ON om.order_sid = od.order_sid 
  SET post_status = 6 
  WHERE od.order_detail_sid = ?`;
  const [updateRes] = await db.query(sqlUpdateOrderMain, [req.body.odSid]);

  const [sqlActComment] = await db.query(
    `
    SELECT activity_sid,
    ROUND(AVG(star), 1) avg_rating
    FROM activity_rating 
    WHERE activity_sid = "${actSid}"
    GROUP BY activity_sid
    `
  );

  const avgRating = sqlActComment[0].avg_rating;

  const [affectedRows] = await db.query(
    `
    UPDATE activity_info ai
    JOIN activity_rating ar ON ar.activity_sid = ai.activity_sid
    SET avg_rating = ${avgRating}
    WHERE ai.activity_sid = "${actSid}"
    `
  );

  res.json({ ...rowsAct, updateRes, affectedRows });
});

//新增商品評價
router.post("/prodReviews", async (req, res) => {
  const sqlProd = `INSERT INTO shop_comment(
    order_detail_sid, product_sid, member_sid, 
    date, rating, content
    ) VALUES (
      ?,?,?,
      NOW(),?,?)`;

  const prodSid = req.body.prodSid;

  const [rowsProd] = await db.query(sqlProd, [
    req.body.odSid,
    prodSid,
    req.body.memberSid,
    req.body.shopStar,
    req.body.shopContent,
  ]);

  const sqlUpdateOrderMain = `UPDATE order_main om
  JOIN order_details od ON om.order_sid = od.order_sid 
  SET post_status = 6 
  WHERE od.order_detail_sid = ?`;
  const [updateRes] = await db.query(sqlUpdateOrderMain, [req.body.odSid]);

  const [sqlProdComment] = await db.query(
    `
    SELECT product_sid,
    ROUND(AVG(rating), 1) avg_rating
    FROM shop_comment 
    WHERE product_sid = "${prodSid}"
    GROUP BY product_sid
    `
  );

  const avgRating = sqlProdComment[0].avg_rating;

  const [affectedRows] = await db.query(
    `
    UPDATE shop_product sp
    JOIN shop_comment sc ON sc.product_sid = sp.product_sid
    SET avg_rating = ${avgRating}
    WHERE sp.product_sid = "${prodSid}"
    `
  );

  //const [updateProductRes] = await db.query(sqlUpdateShopProduct, [prodSid]);

  res.json({ ...rowsProd, updateRes, affectedRows });
});

//新增餐廳評價
router.post("/restReviews", async (req, res) => {
  const sqlProd = `INSERT INTO restaurant_rating(
    rest_sid, booking_sid, member_sid, 
    environment, food, friendly, 
    content, created_at
    ) 
    VALUES (
      ?,?,?,
      ?,?,?,
      ?,NOW()
      )`;

  const restSid = req.body.restSid;

  const [rowsRest] = await db.query(sqlProd, [
    req.body.restSid,
    req.body.bkSid,
    req.body.memberSid,
    req.body.environment,
    req.body.food,
    req.body.friendly,
    req.body.restContent,
  ]);

  const [sqlResComment] = await db.query(
    `
    SELECT rest_sid,
    ROUND(AVG(friendly), 1) average_friendly
    FROM restaurant_rating 
    WHERE rest_sid = "${restSid}"
    GROUP BY rest_sid
    `
  );

  const avgFriendly = sqlResComment[0].average_friendly;

  const [affectedRows] = await db.query(
    `
    UPDATE restaurant_information ri
    JOIN restaurant_rating ra ON ra.rest_sid = ri.rest_sid
    SET average_friendly = ${avgFriendly}
    WHERE ri.rest_sid = "${restSid}"
    `
  );

  res.json({ rowsRest, affectedRows });
});
// 讀取評價
// router.get("/getReviews/:sid", async (req, res) => {
//   let { sid } = req.params;

//   const [rows] = await db.query(
//     `SELECT *, od.order_detail_sid, od.order_sid
//     FROM order_details od
//     JOIN shop_comment sc ON sc.order_detail_sid = od.order_detail_sid
//     WHERE od.order_sid='${sid}'
//   `
//   );

//   const [rows2] = await db.query(
//     `SELECT *, od.order_detail_sid, od.order_sid
//     FROM order_details od
//     JOIN activity_rating ar ON ar.order_detail_sid = od.order_detail_sid
//     WHERE od.order_sid='${sid}'
//   `
//   );

//   const datas = rows.concat(rows2);

//   res.json(datas);
// });

// 抓取餐廳預約資料
router.get("/schedule", async (req, res) => {
  //let { sid } = req.params;

  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const [sqlRestaurant] = await db.query(
    `
    SELECT   
    rb.date as date, 
    rb.member_sid as memberSid, 
    rb.people_num as peopleNum, 
    rb.pet_num as petNum, 
    rb.rest_sid as restSid,
    rb.booking_sid as bkSid,
    ri.name as name,
    ri.phone as phone,
    ri.city as city,
    ri.area as area,
    ri.address as address,
    ri.notice as notice,
    NULL as actSid,
    0 as adultQty,
    0 as childQty,
    NULL as type,
    rpt.time as sectionTime,
    NULL as odSid

    FROM restaurant_booking rb
    JOIN restaurant_information ri ON ri.rest_sid = rb.rest_sid
    JOIN restaurant_period_of_time rpt ON rpt.section_code = rb.section_code
    WHERE rb.member_sid="${sid}"

    UNION ALL

    SELECT 
    od.rel_seq_name as date,
    om.member_sid as memberSid,
    0 as peopleNum,
    0 as petNum,
    NULL as restSid,
    NULL as bkSid,
    od.rel_name as name,
    NULL as phone,
    ai.city as city,
    ai.area as area,
    ai.address as address,
    ai.policy as notice,
    od.rel_sid as actSid,
    od.adult_qty as adultQty,
    od.child_qty as childQty,
    od.rel_type as type,
    ag.time as sectionTime,
    od.order_detail_sid as odSid

    FROM order_details od
    JOIN order_main om
    ON om.order_sid=od.order_sid
    JOIN activity_info ai
    ON ai.activity_sid=od.rel_sid
    JOIN activity_group ag
    ON ag.activity_group_sid=od.rel_seq_sid
    WHERE rel_type="activity" AND om.member_sid="${sid}"
    `
  );

  res.json(sqlRestaurant);
});

// 日曆查詢活動評價
router.get("/getActReview/:sid", async (req, res) => {
  let { sid } = req.params;
  const [rows] = await db.query(
    `
    SELECT * FROM activity_rating WHERE order_detail_sid="${sid}"
`
  );

  res.json(rows);
});

// 日曆查詢餐廳評價
router.get("/getRestReview/:sid", async (req, res) => {
  let { sid } = req.params;
  const [rows] = await db.query(
    `
    SELECT * FROM restaurant_rating WHERE booking_sid="${sid}"
`
  );

  res.json(rows);
});

//讀取每日簽到時間
router.get("/getSignGame", async (req, res) => {
  // let { sid } = req.params;

  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const [sqlGetSignTime] = await db.query(
    `SELECT signin_time 
  FROM member_signin_game 
  WHERE member_sid="${sid}"
  ORDER BY signin_time DESC 
  LIMIT 1`
  );

  res.json(sqlGetSignTime);
});

// 每日簽到寫入
router.post("/createSignGame", async (req, res) => {
  // let { sid } = req.params;

  const output = {
    success: false,
    error: "",
    data: null,
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }
  // console.log(jwtData);

  const sid = res.locals.jwtData.id;

  const sqlCouponSend = `INSERT INTO member_coupon_send(
    coupon_sid, member_sid, coupon_status, 
    used_time, create_time
    ) 
    VALUES (
      ?,?,?,
      ?,NOW()
    )`;

  const [rowCouponSend] = await db.query(sqlCouponSend, ["COUPON00001", sid, 0, null]);

  const sqlLastId = "SELECT LAST_INSERT_ID() as last_insert_id";

  const [rows] = await db.query(sqlLastId);
  const last_insert_id = rows[0].last_insert_id;
  console.log("last_insert_id", last_insert_id);

  const sqlSignGame = `INSERT INTO member_signin_game(
    member_sid, coupon_send_sid, signin_time
    )
    VALUES (
      ?,?,NOW()
      )`;

  const [rowSignGame] = await db.query(sqlSignGame, [sid, last_insert_id]);

  res.json({ rowCouponSend: rowCouponSend, lastInsertId: last_insert_id, rowSignGame });
});

router.get("/hashpwd", async (req, res) => {
  const saltRounds = 10;
  let pwd = "Yantingpan0426";
  let saltPwd = await bcrypt.hash(pwd, saltRounds);
  console.log(saltPwd);
  res.json(saltPwd);
});
