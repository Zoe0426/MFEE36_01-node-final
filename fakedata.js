const mysql = require("mysql");

// 建立 MySQL 連線
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "pet_db",
});

// 生成 member_sid
function generateMemberSid(number) {
  let sid = "mem";

  for (let i = 0; i < 5 - number.toString().length; i++) {
    sid += "0";
  }

  sid += number;

  return sid;
}

// 自動生成會員ID

// 生成假資料
function generateFakeData(number) {
  const genders = ["男", "女", "其他"];
  const pets = ["狗", "貓", "狗貓", "其他"];
  const levels = ["金牌", "銀牌", "銅牌"];
  const lastName = [
    "陳",
    "林",
    "黃",
    "張",
    "李",
    "王",
    "吳",
    "劉",
    "蔡",
    "楊",
    "許",
    "鄭",
    "謝",
    "洪",
    "郭",
    "邱",
    "曾",
    "廖",
    "賴",
    "徐",
    "周",
    "葉",
    "蘇",
    "莊",
    "呂",
    "江",
    "何",
    "蕭",
    "羅",
    "高",
    "潘",
    "簡",
    "朱",
    "鍾",
    "游",
    "彭",
    "詹",
    "胡",
    "施",
    "沈",
  ];
  const firstName = [
    "冠廷",
    "冠宇",
    "宗翰",
    "家豪",
    "彥廷",
    "承翰",
    "柏翰",
    "宇軒",
    "家瑋",
    "冠霖",
    "雅婷",
    "雅筑",
    "怡君",
    "佳穎",
    "怡萱",
    "宜庭",
    "郁婷",
    "怡婷",
    "詩涵",
    "鈺婷",
    "沛怡",
    "宜零",
    "書儀",
    "季庭",
    "宜靜",
    "寧鄉",
  ];

  let name = lastName.random() + firstName.random();

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  let member_ID = "";

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    member_ID += chars[randomIndex];
  }

  const data = {
    member_sid: generateMemberSid(number),
    name: "John Doe",
    email: `john.doe${number}@example.com`,
    password: "password123",
    mobile: "0912345678",
    gender: genders[Math.floor(Math.random() * genders.length)],
    birthday: "1999-01-01",
    pet: pets[Math.floor(Math.random() * pets.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    member_ID: member_ID,
    profile: "https://example.com/profile.jpg",
    game_pet: "https://example.com/game_pet.jpg",
    nickname: "johndoe",
    create_time: new Date(),
    update_time: new Date(),
  };

  return data;
}

// 批次寫入假資料
function insertFakeData() {
  const data = [];

  for (let i = 1; i <= 300; i++) {
    data.push(generateFakeData(i));
  }

  connection.query("INSERT INTO member_info SET ?", data, (error, results, fields) => {
    if (error) throw error;
    console.log(`Inserted ${results.affectedRows} rows`);
  });
}

// 連線到資料庫並寫入假資料
connection.connect((error) => {
  if (error) throw error;

  insertFakeData();
});
