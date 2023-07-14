const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

router.get("/", async (req, res) => {
  const sql =
    "SELECT r.name, r.city, r.area, ru.rule_name, s.service_name FROM restaurant_information AS r JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid JOIN restaurant_service AS s ON asr.service_sid = s.service_sid;";
  const [data] = await db.query(sql);
  res.json(data);
});
//測試
module.exports = router;
console.log(JSON.stringify(router, null, 4));
