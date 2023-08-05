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
const http = require("http");
const express = require("express");
const app = express();
const httpServer = http.createServer(app);
const db = require(__dirname + "/modules/db_connect");
const dayjs = require("dayjs");
const cors = require("cors");
const bodyparesr = require("body-parser");
const jwt = require("jsonwebtoken");
const corsOptions = {
  // Credential: true,
  credentials: true,
  origin: (origin, cb) => {
    console.log({ origin });
    cb(null, true);
  },
};

//socket.io設定白名單
const socketIO = require("socket.io");
const io = socketIO(httpServer, {
  credentials: true,
  cors: {
    origin: (origin, cb) => {
      cb(null, true);
    },
  },

  //老師寫的
  // cors: (req, res) => {
  //   // console.log(req, res)
  //   console.log({ socket: req.headers.origin });
  //   return {
  //     origin: req.headers.origin,
  //   };
  // },
});

const map = new Map();

io.on("connection", (socket) => {
  //經過連線後在 console 中印出訊息
  console.log("success connect!");

  // socket.on("getMessageAll", (message) => {
  //   //回傳給所有連結著的 client
  //   io.sockets.emit("getMessageAll", message);
  // });

  // 當使用者加入聊天室時
  socket.on("joinRoom", (username) => {
    socket.join("chatroom"); // 假設聊天室名稱為 chatroom
    map.set(socket.id, { username }); // 將使用者名稱與 socket 綁定
    io.to("chatroom").emit("partnerJoined", username); // 廣播給其他使用者有新的使用者加入
  });

  // 當使用者傳送訊息時
  socket.on("sendMessage", (message) => {
    const sender = map.get(socket.id)?.username; // 從 Map 中取得使用者名稱
    const roomName = "chatroom"; // 假設聊天室名稱為 chatroom
    io.to(roomName).emit("receiveMessage", { sender, message }); // 廣播訊息給其他使用者，包含傳送者的使用者名稱
  });

  // 當使用者斷線時
  socket.on("disconnect", () => {
    map.delete(socket.id); // 從 Map 中移除斷線的使用者
  });

});

//=====middle ware=====
app.use(bodyparesr.json());
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
  res.toDateDayString = (d) => {
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const date = dayjs(d).format("YYYY.MM.DD");
    const Dday = new Date(date);
    const dayOfWeek = weekdays[Dday.getDay()];
    return `${date}(${dayOfWeek})`;
  };
  res.toDatetimeString = (d) => {
    const fm = "YYYY-MM-DD HH:mm:ss";
    const djs = dayjs(d);
    return djs.format(fm);
  };
  res.toDatetimeString2 = (d) => {
    const fm = "YYYY/MM/DD HH:mm:ss";
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
    // console.log(jwtData);
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
httpServer.listen(port);
/*
app.listen(port, () => {
  console.log("start server, port:" + port);
});
*/
