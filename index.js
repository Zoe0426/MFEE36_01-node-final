//=====.env 環境設定=====
if (process.argv[2] === "production") {
  require("dotenv").config({
    path: __dirname + "/production.env",
  });
} else if (process.argv[2] === "mac") {
  require("dotenv").config({
    path: __dirname + "/mac.env",
  });
} else {
  require("dotenv").config();
}

//=====載入node套件=====
const express = require("express");
const app = express();
const db = require(__dirname + "/modules/db_connect");
const dayjs = require("dayjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const corsOptions = {
  Credential: true,
  origin: (origin, cb) => {
    console.log({ origin });
    cb(null, true);
  },
};
//=====middle ware=====
app.use(cors(corsOptions)); //拜訪權限？
app.use(express.urlencoded({ extended: false })); //翻釋req.body
app.use(express.json()); //翻釋req.body
app.use((req, res, next) => {
  res.title = "狗with咪";
  res.toDateString = (d) => {
    const fm = "YYYY-MM-DD";
    const djs = dayjs(d);
    return djs.format(fm);
  };
  res.toDatetimeString = (d) => {
    const fm = "YYYY-MM-DD HH:mm:ss";
    const djs = dayjs(d);
    return djs.format(fm);
  };

  const auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer ") === 0) {
    const token = auth.slice(7);
    let jwtData = null;
    try {
      jwtData = jwt.verify(token, "GoWithMe");
    } catch (ex) {}
    if (jwtData) {
      res.locals.jwtData = jwtData; // 標記有沒有使用 token
    }
    console.log(jwtData);
  }
    res.toDatetimeString2 = (d)=>{
        const fm = "YYYY/MM/DD HH:mm:ss";
        const djs = dayjs(d);
        return djs.format(fm);
    }
  next();
});
//=====測試=====
app.get("/", (req, res) => {
  res.send("Hello");
});
app.get("/test-db", async (req, res) => {
  //連線、轉換日期格式
  const [data] = await db.query("SELECT * FROM address_book LIMIT 2");
  data.forEach((i) => {
    i.birthday = res.toDatetimeString(i.birthday);
    i.created_at = res.toDatetimeString(i.created_at);
  });
  res.json(data);
});
//=====api路由=====
app.use("/member-api", require(__dirname + "/routes/member-api"));
app.use("/shop-api", require(__dirname + "/routes/shop-api"));
app.use("/activity-api", require(__dirname + "/routes/activity-api"));
app.use("/restaurant-api", require(__dirname + "/routes/restaurant-api"));
app.use("/forum-api", require(__dirname + "/routes/forum-api"));
app.use("/cart-api", require(__dirname + "/routes/cart-api"));

//=====測試api路由，依需求建立=====
app.use("/test-api", require(__dirname + "/routes/test/c-test-api"));
//=====static=====
app.use(express.static("public"));
//=====自訂404=====
app.use((req, res) => {
  res.type("text/html");
  res.status(404);
  res.send("<h1>404 - not found</h1>");
});
//=====port設定=====
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("start server, port:" + port);
});
