const mysql = require('mysql2');

//解構指定的.env檔
const {DB_HOST,DB_USER,DB_PASS,DB_NAME,DB_PORT} = process.env;

//設定連線資訊
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port:DB_PORT,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
})

module.exports = pool.promise();