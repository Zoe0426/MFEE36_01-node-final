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

  //拿關鍵字資料
  let keywords = [];
  let productsName = [];
  let brandsName = [];
  let tags = [];

  const sql_product_names = "SELECT name FROM `shop_product`";
  const [product_names] = await db.query(sql_product_names);
  if (product_names.length > 0) {
    productsName = [...product_names].map((v) => {
      return v.name.split("-")[1].split("(")[0];
    });
    productsName = [...new Set(productsName)];

    tags = [...product_names].map((v) => {
      return v.name.split("-")[1].split("(")[1];
    });
    tags = tags.filter((v) => v != null).map((v) => v.split(")")[0]);
    tags = [...new Set(tags)];
  }

  brandsName = brandData.map((v) => {
    let chineseBrandName = v.name.split(" ");
    return (chineseBrandName = chineseBrandName[chineseBrandName.length - 1]);
  });

  keywords = [...productsName, ...tags, ...brandsName];

  res.json({ dogDatas, catDatas, brandData, newData, keywords });
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

  let perPage = req.query.perPage || 20;
  let keyword = req.query.keyword || "";
  let orderBy = req.query.orderBy || "new_DESC";
  let maxPrice = parseInt(req.query.maxPrice || 0);
  let minPrice = parseInt(req.query.minPrice || 0);

  let category = req.query.category ? req.query.category.split(",") : [];
  let typeForPet = req.query.typeForPet ? req.query.typeForPet.split(",") : [];
  let typeForAge = req.query.typeForAge ? req.query.typeForAge.split(",") : [];
  let filterbrand = req.query.brand ? req.query.brand.split(",") : [];

  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  //queryString條件判斷
  let where = ` WHERE 1`;

  let where_price = "";

  if (maxPrice) {
    where_price += `AND price <= ${maxPrice} `;
  }
  if (minPrice) {
    where_price += `AND price >= ${minPrice} `;
  }
  if (where_price) {
    where_price = `WHERE 1 ${where_price} `;
  }

  //關鍵字
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    where += ` AND (p.name LIKE ${keyword_escaped})`;
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
  LEFT JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
  INNER JOIN (SELECT * FROM shop_product_detail ${where_price}) ps ON p.product_sid = ps.product_sid
  ${where}
  GROUP BY p.product_sid) AS subquery`;

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

    //確定要查詢的頁碼資料比總頁數小 在去拉資料
    const sql = `SELECT p.*, s.name supplier, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating, SUM(product_qty) sales_qty 
        FROM shop_product p
        LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
        INNER JOIN (SELECT * FROM shop_product_detail ${where_price}) ps ON p.product_sid = ps.product_sid
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
    v.like = false;
  });

  //判斷用戶有沒有登入，用token驗證，並拉回該會員是否有對該頁產品有過蒐藏
  if (res.locals.jwtData) {
    const sql_like = `SELECT * FROM shop_like where member_sid="${res.locals.jwtData.id}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      rows = rows.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
    }
  }

  output = {
    ...output,
    totalRows,
    perPage,
    totalPages,
    page,
    rows,
  };
  return res.json(output);
});

//給列表頁供應商+商品名稱的選項API
router.get("/search-brand-list", async (req, res) => {
  let output = {
    brand: [],
    keywords: [],
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

  //取得品牌資訊
  const sql_brand = `SELECT s.name label, s.name value, s.supplier_sid id 
    FROM shop_product p
    LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
    GROUP BY p.supplier_sid
    ORDER BY s.name ASC`;

  const [brand] = await db.query(sql_brand);

  //取得品牌有出哪些類別的商品
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

  let keywords = [];
  let productsName = [];
  let brandsName = [];
  let tags = [];

  const sql_product_names = "SELECT name FROM `shop_product`";
  const [product_names] = await db.query(sql_product_names);
  if (product_names.length > 0) {
    productsName = [...product_names].map((v) => {
      return v.name.split("-")[1].split("(")[0];
    });
    productsName = [...new Set(productsName)];

    tags = [...product_names].map((v) => {
      return v.name.split("-")[1].split("(")[1];
    });
    tags = tags.filter((v) => v != null).map((v) => v.split(")")[0]);
    tags = [...new Set(tags)];
  }

  brandsName = brand.map((v) => {
    let chineseBrandName = v.label.split(" ");
    return (chineseBrandName = chineseBrandName[chineseBrandName.length - 1]);
  });

  keywords = [...productsName, ...tags, ...brandsName];

  output = {
    ...output,
    keywords,
    brand,
  };
  return res.json(output);
});

router.get("/product/:product_sid", async (req, res) => {
  //給細節頁(商品資訊)的路由

  const { product_sid } = req.params;

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }


  //取得商品主要資訊
  const sql_productMainData = `SELECT p.*, s.name supplier_name, s.made_in_where, ROUND(AVG(c.rating), 1) avg_rating, COUNT(c.rating) comment_count,SUM(product_qty) sales_qty
        FROM shop_product p
        JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid
        LEFT JOIN order_details o ON o.rel_sid=p.product_sid 
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
    priceRange = `${minPrice.toLocaleString('en-US')} ~ ${maxPrice.toLocaleString('en-US')}`;
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
  const sql_commentDatas = `SELECT c.*, m.nickname, m.profile
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

  // //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
  // const sql_likeList = `SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
  //   FROM shop_like l
  //   JOIN shop_product p ON p.product_sid=l.product_sid
  //   LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
  //   WHERE member_sid='mem00002'
  //   GROUP BY p.product_sid
  //   ORDER BY date DESC`;
  // const [likeDatas] = await db.query(sql_likeList);

  // likeDatas.forEach((v) => {
  //   v.date = res.toDateString(v.date);
  // });

  res.json({
    shopMainData,
    shopDetailData,
    commentDatas,
    commentEachQty,
    reccomandData,
    // likeDatas,
  });
});

//處理蒐藏愛心的API
router.post("/handle-like-list", async (req, res) => {
  let output = {
    success: true,
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }
  const receiveData = req.body.data;

  console.log(receiveData);

  let deleteLike = [];
  let addLike = [];
  //確定該會員有經過jwt認證並且有傳資料過來，才去資料庫讀取資料
  if (member && receiveData.length > 0) {
    const sql_prelike = `SELECT product_sid FROM shop_like WHERE member_sid="${member}"`;
    const [prelike_rows] = await db.query(sql_prelike);
    const preLikeProducts = prelike_rows.map((v) => {
      return v.product_sid;
    });

    //將收到前端的資料與原先該會員收藏列表比對，哪些是要被刪除，哪些是要被增加
    deleteLike = receiveData
      .filter((v) => preLikeProducts.includes(v.product_sid))
      .map((v) => `"${v.product_sid}"`);
    addLike = receiveData.filter(
      (v) => !preLikeProducts.includes(v.product_sid)
    );
  }

  if (deleteLike.length > 0) {
    const deleteItems = deleteLike.join(", ");
    const sql_delete_like = `DELETE FROM shop_like WHERE member_sid="${member}" AND product_sid IN (${deleteItems})`;
    const [result] = await db.query(sql_delete_like);
    output.success = !!result.affectedRows;
  }

  if (addLike.length > 0) {
    const sql_add_like = ` INSERT INTO shop_like (member_sid, product_sid, date ) VALUES ?`;

    const insertLike = addLike.map((v) => {
      return [member, v.product_sid, res.toDatetimeString(v.time)];
    });

    const [result] = await db.query(sql_add_like, [insertLike]);
    output.success = !!result.affectedRows;
  }
  res.json(output);
});

//讀取蒐藏清單的API
router.get("/show-like-list", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  let likeDatas = [];
  //確定有會員編號在去取得他的喜愛清單
  if (member) {
    const sql_likeList = `SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_like l
    JOIN shop_product p ON p.product_sid=l.product_sid
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE member_sid='${member}'
    GROUP BY p.product_sid
    ORDER BY date DESC`;
    [likeDatas] = await db.query(sql_likeList);
    likeDatas.forEach((v) => {
      v.date = res.toDateString(v.date);
    });
  }

  output = {
    ...output,
    likeDatas,
  };
  return res.json(output);
});

//刪除蒐藏清單的API
router.delete("/likelist/:pid", async (req, res) => {
  let output = {
    success: true,
    likeDatas: [],
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  const { pid } = req.params;
  let sql_deleteLikeList = "DELETE FROM `shop_like` WHERE ";
  if (pid === "all") {
    sql_deleteLikeList += `member_sid = '${member}'`;
  } else {
    sql_deleteLikeList += `member_sid = '${member}' AND product_sid='${pid}'`;
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
