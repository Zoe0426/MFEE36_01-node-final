const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

router.get("/", async (req, res) => {
  const sql = `SELECT r.rest_sid, r.name, r.city, r.area, 
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names, 
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names 
  FROM restaurant_information AS r 
  JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid 
  JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid 
  JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid 
  JOIN restaurant_service AS s ON asr.service_sid = s.service_sid 
  GROUP BY r.rest_sid, r.name, r.city, r.area 
  HAVING COUNT(DISTINCT ru.rule_name) > 1 OR COUNT(DISTINCT s.service_name) > 1;
  `;
  const [data] = await db.query(sql);
  res.json(data);
});

module.exports = router;
console.log(JSON.stringify(router, null, 4));
