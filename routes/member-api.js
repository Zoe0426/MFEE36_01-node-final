const express = require("express");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

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
    token,
  };

  res.json(output);
});

// 讀取單筆會員資料
router.get("/edit/:sid", async (req, res) => {
  let { sid } = req.params;
  const [rows] = await db.query(`SELECT * FROM member_info WHERE member_sid='${sid}' `);
  res.json(rows);
});

router.get("/", async (req, res) => {
  const [rows] = await db.query(`SELECT * FROM member_info`);
  res.json(rows);
});

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
  //  member-indo
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
    member_sid, category, address, 
    default_status, city, area,
    create_time, update_time) VALUES(
    ?, ?, ?,
    ?, ?, ?,
    NOW(), NOW()
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
    req.body.profile,
    game_pet,
    req.body.name,
  ]);

  const [result2] = await db.query(sql2, [new_memSid, 1, req.body.address, 1, req.body.city, req.body.area]);

  res.json({
    result,
    result2,
    postData: req.body,
  });
});
module.exports = router;

// -----------------------------------
// 修改會員資料
router.put("/:sid", multipartParser, async (req, res) => {
  let { sid } = req.params;

  const sql = `UPDATE member_info SET 
  name=?,
  email=?,
  mobile=?,
  gender=?,
  birthday=?,
  pet=?,
  member_ID=?,
  profile=?
  WHERE member_sid='${sid}'`;

  const saltRounds = 10;
  let saltPwd = await bcrypt.hash(req.body.member_password, saltRounds);
  console.log(saltPwd);

  const [result] = await db.query(sql, [
    req.body.member_name,
    req.body.member_email,
    saltPwd,
    req.body.member_mobile,
    req.body.member_gender,
    req.body.member_birth,
    req.body.member_pet,
    req.body.member_level,
    req.body.member_ID,
    req.body.member_profile,
    req.body.member_profile,
  ]);

  res.json({
    success: !!result.changedRows,
    result,
  });
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
  WHERE member_sid='${sid}'`);

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
WHERE o.member_sid = '${sid}'
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
WHERE o.member_sid = '${sid}'
ORDER BY o.create_dt DESC
  `);

  //合併成一個datas
  const datas = rows.concat(rows2);

  //整理datas
  const updatedDatas = datas.map((i) => {
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

// 詳細訂單
router.get("/orderdetail/:sid", async (req, res) => {
  let { sid } = req.params;

  // const output = {
  //   success: false,
  //   error: "",
  //   data: null,
  // };

  // if (!res.locals.jwtData) {
  //   output.error = "沒有驗證";
  //   return res.json(output);
  // }
  // console.log(jwtData);

  //const sid = res.locals.jwtData.id;

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

  const [rows2] = await db.query(`
  SELECT *, o.rel_subtotal orderRelS, od.rel_subtotal, mi.name, mi.mobile
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

  //合併成一個datas
  const datas = rows.concat(rows2);

  //整理datas
  const updatedDatas = datas.map((i) => {
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
      address: i.post_city + i.post_area + i.post_address,
      post_type: i.post_type,
      tread_type: i.tread_type,
      order_create_time: orderCreate,
    };
  });

  res.json(updatedDatas);
});

//新增評價
router.post("/reviews", async (req, res) => {
  const sqlAct = `INSERT INTO activity_rating(
  member_sid, activity_sid, order_detail_sid, 
  star, date, content
  ) 
  VALUES (
    ?,?,?,
    ?,NOW(),?)`;

  const [rowsAct] = await db.query(sqlAct, [
    req.body.memberSid,
    req.body.actSid,
    req.body.odSid,
    req.body.starts,
    req.body.content,
  ]);

  res.json(rowsAct);
});
