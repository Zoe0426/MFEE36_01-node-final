const mysql = require("mysql");

// 建立 MySQL 連線
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "pet_db",
});

// 生成 member_sid
let member_sids = [];

for (let i = 0; i <= 500; i++) {
  const paddedNumber = String(i).padStart(5, "0");
  const member_sid = "mem" + paddedNumber;
  member_sids.push(member_sid);
}

// console.log(member_sids);

// 生成假資料
for (let i = 1; i <= 500; i++) {
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

  // 假名字
  const fakename =
    lastName[Math.floor(Math.random() * lastName.length)] + firstName[Math.floor(Math.random() * firstName.length)];
  // console.log(fakename);

  // 假ID
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  let member_ID = "";

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    member_ID += chars[randomIndex];
  }
  // console.log(member_ID);

  // 假email
  const fakeEmailName = [
    "Jason",
    "Kevin",
    "Eric",
    "David",
    "James",
    "Alex",
    "Jerry",
    "Andy",
    "Jack",
    "Allen",
    "Vincent",
    "Sam",
    "Ken",
    "Chris",
    "Tony",
    "Leo",
    "Peter",
    "Steven",
    "Ryan",
    "Daniel",
    "Olivia",
    "Emma",
    "Charlotte",
    "Amelia",
    "Sophia",
    "Isabella",
    "Ava",
    "Mia",
    "Evelyn",
    "Luna",
  ];

  // 假email數字
  const min = 1000;
  const max = 9999;

  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  // console.log(randomNumber);

  const fakeEmail = fakeEmailName[Math.floor(Math.random() * fakeEmailName.length)] + randomNumber;
  // console.log(fakeEmail);

  // 假手機
  const mobileMin = 10000000;
  const mobileMax = 99999999;

  const randomMobile = Math.floor(Math.random() * (mobileMax - mobileMin + 1)) + mobileMin;

  // console.log(randomMobile);

  // 假生日
  const birthdayMin = new Date("1980-01-01");
  const birthdayMax = new Date("2003-01-01");

  const randomBirthdate = new Date(
    birthdayMin.getTime() + Math.random() * (birthdayMax.getTime() - birthdayMin.getTime())
  );
  const randomBirthday = randomBirthdate.toISOString().split("T")[0];
  // console.log(randomBirthday);

  //假寵物
  const pet = pets[Math.floor(Math.random() * pets.length)];

  //假遊戲寵物
  let game_pet = "";
  switch (pet) {
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
  // console.log(game_pet);

  // 假新增時間
  const createMin = new Date("2020-01-01");
  const createMax = new Date("2023-06-30");

  const randomDate = new Date(createMin.getTime() + Math.random() * (createMax.getTime() - createMin.getTime()));

  const formattedDate = randomDate.toISOString().slice(0, 19).replace("T", " ");

  // console.log(formattedDate);

  // 假更新時間
  const updateTime = new Date(randomDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 新增時間的30天後

  const formattedUpdate = updateTime.toISOString().slice(0, 19).replace("T", " ");
  // console.log(formattedUpdate);

  const data = {
    member_sid: member_sids[i],
    name: fakename,
    email: `${fakeEmail}@gmail.com`,
    password: fakeEmail,
    mobile: `09${randomMobile}`,
    gender: genders[Math.floor(Math.random() * genders.length)],
    birthday: randomBirthday,
    pet: pet,
    level: levels[Math.floor(Math.random() * levels.length)],
    member_ID: member_ID,
    profile: null,
    game_pet: game_pet,
    nickname: fakename,
    create_time: formattedDate,
    update_time: formattedUpdate,
  };
  console.log(data);
}

// let dataObj = [];
// for (let i = 1; i <= 500; i++) {
//   dataObj.push(data[i]);
// }

// console.log(dataObj);

// 批次寫入假資料
function insertFakeData() {
  // const data = [];

  // for (let i = 1; i <= 500; i++) {
  //   data.push(data(i));
  // }

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
// -----------------------------------------------
// fake data from member api
//假資料
router.get("/fakedata", async (req, res) => {
  const sql = `INSERT INTO member_info SET ?`;

  let member_sids = [];

  for (let i = 0; i <= 500; i++) {
    const paddedNumber = String(i).padStart(5, "0");
    const member_sid = "mem" + paddedNumber;
    member_sids.push(member_sid);
  }

  // console.log(member_sids);

  // 生成假資料
  for (let i = 1; i <= 500; i++) {
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

    // 假名字
    const fakename =
      lastName[Math.floor(Math.random() * lastName.length)] + firstName[Math.floor(Math.random() * firstName.length)];
    // console.log(fakename);

    // 假ID
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
    let member_ID = "";

    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      member_ID += chars[randomIndex];
    }
    // console.log(member_ID);

    // 假email
    const fakeEmailName = [
      "Jason",
      "Kevin",
      "Eric",
      "David",
      "James",
      "Alex",
      "Jerry",
      "Andy",
      "Jack",
      "Allen",
      "Vincent",
      "Sam",
      "Ken",
      "Chris",
      "Tony",
      "Leo",
      "Peter",
      "Steven",
      "Ryan",
      "Daniel",
      "Olivia",
      "Emma",
      "Charlotte",
      "Amelia",
      "Sophia",
      "Isabella",
      "Ava",
      "Mia",
      "Evelyn",
      "Luna",
    ];

    // 假email數字
    const min = 1000;
    const max = 9999;

    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    // console.log(randomNumber);

    const fakeEmail = fakeEmailName[Math.floor(Math.random() * fakeEmailName.length)] + randomNumber;
    // console.log(fakeEmail);

    //假密碼
    const password = fakeEmail;

    // 密碼加鹽;
    const saltRounds = 10;
    let saltPwd = await bcrypt.hash(fakeEmail, saltRounds);
    console.log(saltPwd);

    // 假手機
    const mobileMin = 10000000;
    const mobileMax = 99999999;

    const randomMobile = Math.floor(Math.random() * (mobileMax - mobileMin + 1)) + mobileMin;

    // console.log(randomMobile);

    // 假生日
    const birthdayMin = new Date("1980-01-01");
    const birthdayMax = new Date("2003-01-01");

    const randomBirthdate = new Date(
      birthdayMin.getTime() + Math.random() * (birthdayMax.getTime() - birthdayMin.getTime())
    );
    const randomBirthday = randomBirthdate.toISOString().split("T")[0];
    // console.log(randomBirthday);

    //假寵物
    const pet = pets[Math.floor(Math.random() * pets.length)];

    //假遊戲寵物
    let game_pet = "";
    switch (pet) {
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
    // console.log(game_pet);

    // 假新增時間
    const createMin = new Date("2020-01-01");
    const createMax = new Date("2023-06-30");

    const randomDate = new Date(createMin.getTime() + Math.random() * (createMax.getTime() - createMin.getTime()));

    const formattedDate = randomDate.toISOString().slice(0, 19).replace("T", " ");

    // console.log(formattedDate);

    // 假更新時間
    const updateTime = new Date(randomDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 新增時間的30天後

    const formattedUpdate = updateTime.toISOString().slice(0, 19).replace("T", " ");
    // console.log(formattedUpdate);

    const data = {
      member_sid: member_sids[i],
      name: fakename,
      email: `${fakeEmail}@gmail.com`,
      password: saltPwd,
      mobile: `09${randomMobile}`,
      gender: genders[Math.floor(Math.random() * genders.length)],
      birthday: randomBirthday,
      pet: pet,
      level: levels[Math.floor(Math.random() * levels.length)],
      member_ID: member_ID,
      profile: null,
      game_pet: game_pet,
      nickname: fakename,
      create_time: formattedDate,
      update_time: formattedUpdate,
    };
    console.log(data);
    const [result] = await db.query(sql, data);
  }

  // res.json(result);
});

//假地址
router.get("/faker", async (req, res) => {
  let member_sids = [];

  for (let i = 0; i <= 500; i++) {
    const paddedNumber = String(i).padStart(5, "0");
    const member_sid = "mem" + paddedNumber;
    member_sids.push(member_sid);
  }
  const sql = `INSERT INTO member_address SET ?`;

  //  台北市
  for (let i = 101; i <= 200; i++) {
    const counties = ["台中市"];
    const districts = ["中區", "東區", "南區", "西區", "北區", "西屯區", "南屯區", "北屯區", "大甲區"];
    const roadNames = [
      "中山路",
      "林森路",
      "成功路",
      "復興路",
      "文心南路",
      "大墩十七街",
      "洛陽街",
      "建國北路",
      "忠明南路",
      "健行路",
      "英才路",
      "青年路",
      "五權南路",
      "經國路",
      "旅順街",
    ];

    const randomCountyIndex = Math.floor(Math.random() * counties.length);
    const county = counties[randomCountyIndex];

    const randomDistrictIndex = Math.floor(Math.random() * districts.length);
    const district = districts[randomDistrictIndex];

    const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
    const road = roadNames[randomRoadIndex];

    const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
    const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

    // 假新增時間
    const createMin = new Date("2020-01-01");
    const createMax = new Date("2023-06-30");

    const randomDate = new Date(createMin.getTime() + Math.random() * (createMax.getTime() - createMin.getTime()));

    const formattedDate = randomDate.toISOString().slice(0, 19).replace("T", " ");

    // console.log(formattedDate);

    // 假更新時間
    const updateTime = new Date(randomDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 新增時間的30天後

    const formattedUpdate = updateTime.toISOString().slice(0, 19).replace("T", " ");
    // console.log(formattedUpdate);

    const data = {
      member_sid: member_sids[i],
      category: 1,
      address: roadNames[Math.floor(Math.random() * roadNames.length)],
      default_status: 1,
      city: counties,
      area: districts[Math.floor(Math.random() * districts.length)],
      create_time: formattedDate,
      update_time: formattedUpdate,
    };
    console.log(data);
    const [result] = await db.query(sql, data);
  }
});
