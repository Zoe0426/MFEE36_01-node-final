const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

router.get("/hompage-cards", async (req, res) => {
  //給首頁新品卡片的路由

  //取首頁新品卡片資訊
  const sql_newData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
    GROUP BY p.product_sid
    ORDER BY update_date DESC
    LIMIT 0, 23`;
  const [newData] = await db.query(sql_newData);

  //取首頁供應商卡片資訊
  const sql_brandData = `SELECT * FROM shop_supplier LIMIT 0, 15`;
  const [brandData] = await db.query(sql_brandData);

  //取首頁汪星人卡片資訊
  const sql_dogData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='D'
    GROUP BY p.product_sid
    LIMIT 0, 29`;
  const [dogDatas] = await db.query(sql_dogData);

  //取首頁喵星人卡片資訊
  const sql_catData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='C'
    GROUP BY p.product_sid
    LIMIT 0, 23`;
  const [catDatas] = await db.query(sql_catData);

  res.json({ dogDatas, catDatas, brandData, newData });
});


//給列表頁面使用的API
router.get("/products", async (req, res) => {
  let output = {
    totalRows: 0,
    perPage: 20,
    totalPages: 0,
    page: 1,
    rows: [],
  };


  const keywordDict = [
    { word: "犬", col: 'AND p.for_pet_type IN ("D", "B") '},
    { word: "狗", col: 'AND p.for_pet_type IN ("D", "B") '},
    { word: "汪星人", col: 'AND p.for_pet_type IN ("D", "B") '},
    { word: "貓", col: 'AND p.for_pet_type IN ("C", "B") '},
    { word: "喵星人", col: 'AND p.for_pet_type IN ("C", "B") '},
    { word: "幼", col: 'AND ps.for_age IN (1, 4) ' },
    { word: "成", col: 'AND ps.for_age IN (2, 4) ' },
    { word: "高齡", col: 'AND ps.for_age IN (3, 4) ' },
    { word: "老", col: 'AND ps.for_age IN (3, 4) ' },
    { word: "飼料", col: 'AND p.category_detail_sid="FE" '},
    { word: "罐頭", col: 'AND p.category_detail_sid="CA" '},
    { word: "零食", col: 'AND p.category_detail_sid="SN" '},
    { word: "保健", col: 'AND p.category_detail_sid="HE" '},
    { word: "服飾", col: 'AND p.category_detail_sid="DR" '},
    { word: "衣", col: 'AND p.category_detail_sid="DR" '},
    { word: "外出用品", col: 'AND p.category_detail_sid="OD" '},
    { word: "玩具", col: 'AND p.category_detail_sid="TO" '},
    { word: "其他", col: 'AND p.category_detail_sid="OT" '},
    { word: "Hills", col: 'AND s.name="Hills 希爾思" '},
    { word: "希爾思", col: 'AND s.name="Hills 希爾思" '},
    { word: "Orijen", col: 'AND s.name="Orijen 極緻" '},
    { word: "極緻", col: 'AND s.name="Orijen 極緻" '},
    { word: "Toma pro", col: 'AND s.name="Toma-pro 優格" '},
    { word: "GoMo Pet Food", col: 'AND s.name="GoMo Pet Food" '},
  ];

  const dict = {
    dog: "D",
    cat: "C",
    both: "B",
    younger: 1,
    adult: 2,
    elder: 3,
    all: 4,
    food: "FE",
    can: "CA",
    snack: "SN",
    health: "HE",
    dress: "DR",
    outdoor: "OD",
    toy: "TO",
    other: "OT",
    price_ASC: "min_price ASC, max_price ASC",
    price_DESC: "min_price DESC, max_price DESC",
    new_DESC: "shelf_date DESC",
    sales_DESC: "sales_qty DESC",
  };

  // const perPage=16;
  let perPage = req.query.perPage || 20;
  let keyword = req.query.keyword || "";
  let orderBy = req.query.orderBy || "new_DESC";

  let category = req.query.category ? req.query.category.split(",") : [];
  let typeForPet = req.query.typeForPet ? req.query.typeForPet.split(",") : [];
  let typeForAge = req.query.typeForAge ? req.query.typeForAge.split(",") : [];
  let filterbrand = req.query.brand ? req.query.brand.split(",") : [];

  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  //queryString條件判斷
  let where = " WHERE 1 ";
  //關鍵字
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    let condition="";
    keywordDict.forEach((v)=>{
      if(keyword_escaped.includes(v.word)){
        condition +=v.col
      }
    })
    const newCondition=condition.slice(3)
    console.log({newCondition})
    if(newCondition){
       where += ` AND (p.name LIKE ${keyword_escaped} OR ${newCondition})`
    }else{
      where += ` AND (p.name LIKE ${keyword_escaped})`
    }
   

  }

  //篩選
  if (category.length > 0 && category.length < 8) {
    let newCategory = category.map((v) => db.escape(dict[v])).join(", ");
    const cateFilter = ` AND p.category_detail_sid IN (${newCategory}) `;
    where += cateFilter;
  }
  if (typeForPet.length > 0 && typeForPet.length < 2) {
    let newTypeForPet = typeForPet.map((v) => db.escape(dict[v])).join(", ");
    where += ` AND p.for_pet_type IN (${newTypeForPet}, "B") `;
  }

  if (typeForAge.length > 0 && typeForAge.length < 3) {
    let newTypeForAge = typeForAge.map((v) => db.escape(dict[v])).join(", ");
    where += ` AND ps.for_age IN (${newTypeForAge}, 4) `;
  }

  if (filterbrand.length > 0) {
    let newFilterbrand = filterbrand.map((v) => db.escape(v)).join(", ");
    where += ` AND s.name IN (${newFilterbrand}) `;
  }

  //排序
  let order = " ORDER BY ";
  const order_escaped = dict[orderBy];
  order += ` ${order_escaped} `;

  //進資料庫拉資料---------------
  //取得總筆數資訊
  const sql_totalRows = `SELECT COUNT(1) totalRows 
  FROM (
    SELECT p.product_sid
    FROM shop_product p 
    LEFT JOIN shop_product_detail ps ON p.product_sid = ps.product_sid
    LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
    ${where}
    GROUP BY p.product_sid
  ) AS subquery`;

  const [[{ totalRows }]] = await db.query(sql_totalRows);
  let totalPages = 0;
  let rows = [];

  //有資料時
  if (totalRows) {
    //取得總頁數
    totalPages = Math.ceil(totalRows / perPage);

    if (page > totalPages) {
      page = totalPages;
    }

    //確定要查詢的頁碼資料比總頁數小，才去拉資料
    const sql = `SELECT p.*, s.name supplier, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating, SUM(product_qty) sales_qty
        FROM shop_product p
        LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid
        LEFT JOIN order_details o ON o.rel_sid=p.product_sid
        ${where}
        GROUP BY p.product_sid
        ${order}
        LIMIT ${perPage * (page - 1)}, ${perPage}
        `;
    [rows] = await db.query(sql);
  }

  //將得到的資料的日期轉換為當地格式
  rows.forEach((v) => {
    v.shelf_date = res.toDatetimeString(v.shelf_date);
    v.update_date = res.toDatetimeString(v.update_date);
  });

  //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
  const sql_likeList = `SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_like l
    JOIN shop_product p ON p.product_sid=l.product_sid
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE member_sid='mem00002'
    GROUP BY p.product_sid
    ORDER BY date DESC`;
  const [likeDatas] = await db.query(sql_likeList);

  likeDatas.forEach((v) => {
    v.date = res.toDateString(v.date);
  });

  output = {
    ...output,
    totalRows,
    perPage,
    totalPages,
    page,
    rows,
    likeDatas,
    // brand,
  };
  console.log({where})
  return res.json(output);
});

//給列表頁供應商的選項API
router.get("/brand-list", async (req, res) => {
  let output = {
    success: false,
    brand: [],
  };

  const dict = {
    dog: "D",
    cat: "C",
    both: "B",
    younger: 1,
    adult: 2,
    elder: 3,
    all: 4,
    food: "FE",
    can: "CA",
    snack: "SN",
    health: "HE",
    dress: "DR",
    outdoor: "OD",
    toy: "TO",
    other: "OT",
  };

  const sql_brand = `SELECT s.name label, s.name value, s.supplier_sid id 
    FROM shop_product p
    LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
    GROUP BY p.supplier_sid
    ORDER BY s.name ASC`;

  const [brand] = await db.query(sql_brand);

  const sql_brand_has = `SELECT p.supplier_sid id, p.category_detail_sid, p.for_pet_type, ps.for_age
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    GROUP BY p.supplier_sid, p.category_detail_sid, p.for_pet_type, ps.for_age`;

  const [brand_has] = await db.query(sql_brand_has);

  const findKey = (value) => {
    return Object.keys(dict).find((key) => dict[key] === value);
  };
  brand_has.forEach((v) => {
    (v.category_detail_sid = findKey(v.category_detail_sid)),
      (v.for_pet_type = findKey(v.for_pet_type)),
      (v.for_age = findKey(v.for_age));
  });

  brand.forEach((v1) => {
    v1.category_detail_sid = [];
    v1.for_pet_type = [];
    v1.for_age = [];

    brand_has.forEach((v2) => {
      if (v1.id === v2.id) {
        if (!v1.category_detail_sid.includes(v2.category_detail_sid)) {
          v1.category_detail_sid.push(v2.category_detail_sid);
        }
        if (!v1.for_pet_type.includes(v2.for_pet_type)) {
          v1.for_pet_type.push(v2.for_pet_type);
        }
        if (!v1.for_age.includes(v2.for_age)) {
          v1.for_age.push(v2.for_age);
        }
      }
    });
  });

  output = {
    ...output,
    brand,
  };
  console.log(brand);
  return res.json(output);
});

router.get("/product/:product_sid", async (req, res) => {
  //給細節頁(商品資訊)的路由

  const { product_sid } = req.params;

  //取得商品主要資訊
  const sql_productMainData = `SELECT p.*, s.name supplier_name, s.made_in_where, ROUND(AVG(c.rating), 1) avg_rating, COUNT(c.rating) comment_count
        FROM shop_product p
        JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
        WHERE p.product_sid="${product_sid}"`;

  let [shopMainData] = await db.query(sql_productMainData);
  //return res.json(shopMainData)

  //將麵包屑中文與前端路由英文的產品類別轉換放置商品主要資訊
  const dict = {
    CA: ["罐頭", "can"],
    FE: ["飼料", "food"],
    SN: ["零食", "snack"],
    HE: ["保健品", "health"],
    DR: ["服飾", "dress"],
    OD: ["戶外用品", "outdoor"],
    TO: ["玩具", "toy"],
    OT: ["其他", "other"],
  };
  const catergory_chinese_name = dict[shopMainData[0].category_detail_sid][0];
  const catergory_english_name = dict[shopMainData[0].category_detail_sid][1];
  shopMainData[0].catergory_chinese_name = catergory_chinese_name;
  shopMainData[0].catergory_english_name = catergory_english_name;

  //取得細項規格的資訊
  const sql_productDetailData = `SELECT * FROM shop_product_detail WHERE product_sid="${product_sid}"`;

  let [shopDetailData] = await db.query(sql_productDetailData);

  //須將價格區間、主商品照片細項規格合併
  //1.取得價格區間
  const prices = shopDetailData.map((v) => v.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  let priceRange;
  if (maxPrice !== minPrice) {
    priceRange = `${minPrice} ~ ${maxPrice}`;
  } else {
    priceRange = minPrice;
  }
  //2.取得主商品照片
  const [{ img: mainImg }] = shopMainData;
  //3.將上述資訊結合成預設資訊
  const defaultObj = {
    product_detail_sid: "00",
    product_sid: product_sid,
    name: "default",
    price: priceRange,
    qty: 0,
    img: mainImg,
    for_age: 0,
  };

  //4.將預設資訊與細項規格合併
  shopDetailData = [defaultObj, ...shopDetailData];

  //取得評價資訊，還需要修改，因為要join member的表格
  const sql_commentDatas = `SELECT c.*, m.name, m.profile
    FROM shop_comment c
    LEFT JOIN member_info m ON m.member_sid=c.member_sid
    WHERE product_sid="${product_sid}" ORDER BY c.date DESC`;

  const [commentDatas] = await db.query(sql_commentDatas);

  //將卡片內的日期轉換為當地格式
  commentDatas.forEach((v) => {
    v.date = res.toDateString(v.shelf_date);
  });

  //取得該商品各項評分的筆數
  const sql_commentQtyForEach = `SELECT rating, COUNT(*) count
    FROM shop_comment
    WHERE product_sid = "${product_sid}"
    GROUP BY rating ORDER BY rating DESC`;

  const [commentEachQty] = await db.query(sql_commentQtyForEach);

  //依據客戶所查的商品，用寵物類別隨機推薦商品給客戶
  const customerLookforPet = shopMainData[0].for_pet_type;
  const sql_reccomandData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='${customerLookforPet}'
    GROUP BY p.product_sid
    ORDER BY RAND()
    LIMIT 24`;
  const [reccomandData] = await db.query(sql_reccomandData);

  //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
  const sql_likeList = `SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_like l
    JOIN shop_product p ON p.product_sid=l.product_sid
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE member_sid='mem00002'
    GROUP BY p.product_sid
    ORDER BY date DESC`;
  const [likeDatas] = await db.query(sql_likeList);

  likeDatas.forEach((v) => {
    v.date = res.toDateString(v.date);
  });

  res.json({
    shopMainData,
    shopDetailData,
    commentDatas,
    commentEachQty,
    reccomandData,
    likeDatas,
  });
});

// router.get("/maincard/:cat", async (req, res) => {
//   const { cat } = req.params;

//   //製作類別字典，以判斷動態路由，所選擇責的類別
//   const dict = {
//     can: ["category_detail_sid", "CA"],
//     food: ["category_detail_sid", "FE"],
//     snack: ["category_detail_sid", "SN"],
//     health: ["category_detail_sid", "HE"],
//     dress: ["category_detail_sid", "DR"],
//     outdoor: ["category_detail_sid", "OD"],
//     toy: ["category_detail_sid", "TO"],
//     other: ["category_detail_sid", "OT"],
//   };

//   //取得卡片資訊
//   const sql_cardData = `SELECT p.*, s.name supplier, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
//         FROM shop_product p
//         LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
//         LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
//         LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE ${dict[cat][0]}='${dict[cat][1]}'
//         GROUP BY p.product_sid
//         LIMIT 0, 15`;
//   const [cardData] = await db.query(sql_cardData);
//   console.log(cardData);

//   //將卡片內的日期轉換為當地格式
//   cardData.forEach((v) => {
//     v.shelf_date = res.toDatetimeString(v.shelf_date);
//     v.update_date = res.toDatetimeString(v.update_date);
//   });

//   //取得總筆數資訊
//   const sql_totalRows = `SELECT COUNT(1) totalRows FROM shop_product WHERE ${dict[cat][0]}='${dict[cat][1]}'`;
//   const [[{ totalRows }]] = await db.query(sql_totalRows);

//   //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
//   const sql_likeList = `SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
//         FROM shop_like l
//         JOIN shop_product p ON p.product_sid=l.product_sid
//         LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
//         WHERE member_sid='mem00002'
//         GROUP BY p.product_sid
//         ORDER BY date DESC`;
//   const [likeDatas] = await db.query(sql_likeList);

//   likeDatas.forEach((v) => {
//     v.date = res.toDateString(v.date);
//   });

//   //依據類別給回傳篩選時有哪幾家品牌
//   const sql_brandDatas = `SELECT s.name label, s.supplier_sid value
//     FROM shop_product p
//     JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
//     WHERE ${dict[cat][0]}='${dict[cat][1]}'
//     GROUP BY p.supplier_sid
//     ORDER BY s.name ASC`;

//   const [brandDatas] = await db.query(sql_brandDatas);

//   res.json({ totalRows, cardData, likeDatas, brandDatas });
//   // data.forEach(i=>{
//   //     i.birthday = res.toDatetimeString(i.birthday)
//   //     i.created_at = res.toDatetimeString(i.created_at)
//   // });
//   // res.json(data)
// });

//刪除收藏清單的API

router.delete("/likelist/:pid/:mid", async (req, res) => {
  const { pid, mid } = req.params;
  let sql_deleteLikeList = "DELETE FROM `shop_like` WHERE ";
  if (pid === "all") {
    sql_deleteLikeList += `member_sid = '${mid}'`;
  } else {
    sql_deleteLikeList += `member_sid = '${mid}' AND product_sid='${pid}'`;
  }

  try {
    const [result] = await db.query(sql_deleteLikeList);
    res.json({ ...result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }

  /*
    {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 0,
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0,
    "sid": "7"
}
    */
});

module.exports = router;
