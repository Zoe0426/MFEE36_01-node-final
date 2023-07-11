const express = require("express");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

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
  // member-indo
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

