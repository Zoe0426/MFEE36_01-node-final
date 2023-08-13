const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

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

//給首頁用的API
router.get("/hompage-cards", async (req, res) => {
  //給首頁新品卡片的路由
  let newData = [];
  let dogDatas = [];
  let catDatas = [];
  const sql_newData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price 
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    GROUP BY p.product_sid
    ORDER BY update_date DESC
    LIMIT 0, 30`;
  [newData] = await db.query(sql_newData);

  //取首頁供應商卡片資訊
  const sql_brandData = `SELECT * FROM shop_supplier LIMIT 0, 15`;
  const [brandData] = await db.query(sql_brandData);

  //取首頁汪星人卡片資訊
  const sql_dogData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price 
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE for_pet_type='D'
    GROUP BY p.product_sid
    ORDER BY sales_qty DESC
    LIMIT 0, 30`;
  [dogDatas] = await db.query(sql_dogData);

  //取首頁喵星人卡片資訊
  const sql_catData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price 
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE for_pet_type='C'
    GROUP BY p.product_sid
    ORDER BY sales_qty DESC
    LIMIT 0, 30`;
  [catDatas] = await db.query(sql_catData);

  //判斷用戶有沒有登入，用token驗證，並拉回該會員是否有對該頁產品有過收藏

  if (res.locals.jwtData) {
    const sql_like = `SELECT * FROM shop_like where member_sid="${res.locals.jwtData.id}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      newData = newData.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1, like: false };
      });

      dogDatas = dogDatas.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1, like: false };
      });

      catDatas = catDatas.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1, like: false };
      });
    }
  }

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

  keywords = [...productsName, ...tags, ...brandsName].sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  );

  res.json({ dogDatas, catDatas, brandData, newData, keywords });
});

//給列表頁供應商+商品名稱的選項API
router.get("/search-brand-list", async (req, res) => {
  let output = {
    brand: [],
    keywords: [],
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

  const reversedDict = {};
  Object.entries(dict).forEach(([key, value]) => {
    reversedDict[value] = key;
  });

  brand_has.forEach((v) => {
    // 使用Set來存儲不重複的值
    v.category_detail_sid = new Set([reversedDict[v.category_detail_sid]]);
    v.for_pet_type = new Set([reversedDict[v.for_pet_type]]);
    v.for_age = new Set([reversedDict[v.for_age]]);
  });

  brand.forEach((v1) => {
    v1.category = new Set();
    v1.typeForPet = new Set();
    v1.typeForAge = new Set();

    brand_has.forEach((v2) => {
      if (v1.id === v2.id) {
        v1.category.add(...v2.category_detail_sid);
        v1.typeForPet.add(...v2.for_pet_type);
        v1.typeForAge.add(...v2.for_age);
      }
    });

    // 使用Set轉換為陣列
    v1.category = Array.from(v1.category);
    v1.typeForPet = Array.from(v1.typeForPet);
    v1.typeForAge = Array.from(v1.typeForAge);
  });

  brand.forEach((v1) => {
    if (v1.typeForPet.includes("cat") && v1.typeForPet.includes("dog")) {
      v1.typeForPet = ["cat", "dog", "both"];
    }
    if (v1.typeForPet.includes("both")) {
      v1.typeForPet = ["cat", "dog", "both"];
    }
    if (
      v1.typeForAge.includes("younger") &&
      v1.typeForAge.includes("adult") &&
      v1.typeForAge.includes("elder")
    ) {
      v1.typeForAge = ["younger", "adult", "elder", "all"];
    }
    if (v1.typeForAge.includes("all")) {
      v1.typeForAge = ["younger", "adult", "elder", "all"];
    }
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

//給列表頁面使用的API
router.get("/products", async (req, res) => {
  //先將要用的算數的表格先view起來，以便之後快速查詢
  // const sql_view = `CREATE TABLE shop_product AS
  // SELECT p.*, s.name supplier, ROUND(AVG(c.rating), 1) avg_rating, SUM(product_qty) sales_qty
  // FROM shop_product p
  // LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
  // LEFT JOIN shop_comment c ON p.product_sid=c.product_sid
  // LEFT JOIN order_details o ON o.rel_sid=p.product_sid
  // GROUP BY p.product_sid
  // `;
  // const [rows] = await db.query(sql_view);

  let output = {
    totalRows: 0,
    perPage: 16,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  let perPage = req.query.perPage || 16;
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
  let where_supplier = "";

  if (maxPrice && minPrice) {
    if (minPrice > maxPrice) {
      const newMaxPrice = minPrice;
      minPrice = maxPrice;
      maxPrice = newMaxPrice;
    }
  }

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
    where_supplier = ` WHERE name IN (${newFilterbrand}) `;
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
  INNER JOIN (SELECT * FROM shop_product_detail ${where_price}) ps ON p.product_sid = ps.product_sid
  INNER JOIN (SELECT * FROM shop_supplier ${where_supplier}) s ON s.supplier_sid=p.supplier_sid
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
    const sql = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price  
        FROM shop_product p
        INNER JOIN (SELECT * FROM shop_product_detail ${where_price}) ps ON p.product_sid = ps.product_sid
        INNER JOIN (SELECT * FROM shop_supplier ${where_supplier}) s ON s.supplier_sid=p.supplier_sid
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

  //判斷用戶有沒有登入，用token驗證，並拉回該會員是否有對該頁產品有過收藏
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

//給細節頁面使用的API
router.get("/product/:product_sid", async (req, res) => {
  //給細節頁(商品資訊)的路由

  const { product_sid } = req.params;

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }

  let shopMainData = [];

  //取得商品主要資訊
  const sql_productMainData = `SELECT p.*, s.name supplier_name, s.made_in_where, COUNT(c.rating) comment_count
        FROM shop_product p
        JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid
        WHERE p.product_sid="${product_sid}"`;

  [shopMainData] = await db.query(sql_productMainData);

  //判斷用戶有沒有登入，用token驗證，並確認該產品有沒有收藏

  if (member) {
    const sql_like = `SELECT * FROM shop_like where member_sid="${res.locals.jwtData.id}" AND product_sid="${product_sid}" `;
    const [like_rows] = await db.query(sql_like);
    shopMainData =
      like_rows.length > 0
        ? [{ ...shopMainData[0], like: true }]
        : [{ ...shopMainData[0], like: false }];
  }

  //將麵包屑中文與前端路由英文的產品類別轉換放置商品主要資訊
  const dictRouter = {
    CA: ["罐頭", "can"],
    FE: ["飼料", "food"],
    SN: ["零食", "snack"],
    HE: ["保健品", "health"],
    DR: ["服飾", "dress"],
    OD: ["戶外用品", "outdoor"],
    TO: ["玩具", "toy"],
    OT: ["其他", "other"],
  };
  const catergory_chinese_name =
    dictRouter[shopMainData[0].category_detail_sid][0];
  const catergory_english_name =
    dictRouter[shopMainData[0].category_detail_sid][1];
  shopMainData[0].catergory_chinese_name = catergory_chinese_name;
  shopMainData[0].catergory_english_name = catergory_english_name;

  let shopDetailData = [];
  //取得細項規格的資訊
  const sql_productDetailData = `SELECT * FROM shop_product_detail WHERE product_sid="${product_sid}"`;

  [shopDetailData] = await db.query(sql_productDetailData);

  //須將價格區間、主商品照片細項規格合併
  //1.取得價格區間
  const prices = shopDetailData.map((v) => v.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  let priceRange;
  if (maxPrice !== minPrice) {
    priceRange = `${minPrice.toLocaleString(
      "en-US"
    )} ~ ${maxPrice.toLocaleString("en-US")}`;
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

  //取得評價資訊
  let commentDatas = [];
  const sql_commentDatas = `SELECT c.*, m.nickname, m.profile
    FROM shop_comment c
    LEFT JOIN member_info m ON m.member_sid=c.member_sid
    WHERE product_sid="${product_sid}" ORDER BY c.date DESC`;

  [commentDatas] = await db.query(sql_commentDatas);

  // return res.json({ commentDatas });

  //將卡片內的日期轉換為當地格式
  if (commentDatas.length > 0) {
    commentDatas.forEach((v) => {
      v.date = res.toDateString(v.date);
    });
  }

  //依據客戶所查的商品，用寵物類別隨機推薦商品給客戶
  let reccomandData = [];
  const customerLookforPet = shopMainData[0].for_pet_type;
  const sql_reccomandData = `SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE for_pet_type='${customerLookforPet}'
    GROUP BY p.product_sid
    ORDER BY RAND()
    LIMIT 24`;
  [reccomandData] = await db.query(sql_reccomandData);
  // console.log(reccomandData.length);

  //判斷用戶有沒有登入，用token驗證，並拉回該會員是否有對該頁產品有過收藏
  if (member) {
    const sql_like = `SELECT * FROM shop_like where member_sid="${member}" `;
    const [like_rows] = await db.query(sql_like);
    if (like_rows.length > 0) {
      reccomandData = reccomandData.map((v1) => {
        const foundLike = like_rows.find(
          (v2) => v1.product_sid === v2.product_sid
        );
        return foundLike ? { ...v1, like: true } : { ...v1 };
      });
    }
  }

  res.json({
    shopMainData,
    shopDetailData,
    commentDatas,
    reccomandData,
  });
});

//處理購物車的API
router.post("/sent-to-cart", async (req, res) => {
  let output = {
    success: true,
  };

  let member = "";
  if (res.locals.jwtData) {
    member = res.locals.jwtData.id;
  }
  const receiveData = req.body;
  let alreadyInCart = [];
  let result = [];

  //先確認該會員先前是否該商品有加入購物車了
  if (member) {
    const sql_checkCart = `SELECT * FROM order_cart WHERE member_sid="${member}" AND rel_sid="${receiveData.pid}" AND rel_seq_sid="${receiveData.spec}" AND order_status="001"`;
    [alreadyInCart] = await db.query(sql_checkCart);

    if (alreadyInCart.length > 0) {
      //代表該商品已經有加入購物車，則要新增數量
      const [oldInCart] = alreadyInCart;
      const newQty =
        parseInt(oldInCart.product_qty) + parseInt(receiveData.qty);
      const sql_updateCart = "UPDATE order_cart SET ? WHERE cart_sid='?'";
      [result] = await db.query(sql_updateCart, [
        { ...oldInCart, product_qty: newQty },
        oldInCart.cart_sid,
      ]);
      output.success = !!result.changedRows;
    } else {
      if (receiveData.spec) {
        const sql_cart = `INSERT INTO order_cart
    (member_sid, rel_type, rel_sid, rel_seq_sid, product_qty, adult_qty, child_qty, order_status) VALUES
    (?,?,?,?,?,?,?,?)
    `;

        [result] = await db.query(sql_cart, [
          member,
          "shop",
          receiveData.pid,
          receiveData.spec,
          receiveData.qty,
          null,
          null,
          "001",
        ]);
        output.success = !!result.affectedRows;
      }
    }
  }

  res.json(output);
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

//製作評價假資料....
router.get("/create-comment", async (req, res) => {
  const getorder_sql =
    'SELECT order_detail_sid, rel_sid FROM order_details WHERE rel_type="shop" ';
  const [getorder] = await db.query(getorder_sql);

  const selectIndex = Math.floor(Math.random() * 10);

  for (const v of getorder) {
    const doInsert = Math.random();
    const selectIndex = Math.floor(Math.random() * 10);
    const category = v.rel_sid.slice(2, 4);
    const FE_comment = [
      "我的寵物喜歡這飼料的味道，每次都吃得乾乾淨淨，看得出來它很享受！",
      "這款飼料營養豐富，讓我的寵物保持健康活力，毛皮也變得又亮又柔軟",
      "這個飼料真是物超所值，不僅份量十足，而且成分天然，我放心讓寵物食用",
      "我家的毛孩對這個飼料愛不釋手，每次拿出來就興奮不已，吃完還舔個乾淨",
      "這款飼料的口味很多樣，我家貓狗都喜歡，給寵物多一點選擇真是太好了",
      "我的毛寶貝對這個飼料情有獨鍾，每天都期待著吃它，我也放心因為它營養均衡",
      "這個飼料真是太方便了，不僅好吃而且包裝得很好，保存起來也不用擔心變質",
      "我買了這個飼料後，寵物的毛髮狀態明顯改善，變得更濃密順滑，真的很有效",
      "這款飼料不含人工添加物，我對它的品質很滿意，而且看得出來寵物很喜歡",
      "飼料中的成分很天然，對於我的寵物來說很容易消化吸收，我會一直回購的",
    ];
    const CA_comment = [
      "我家毛孩最愛這款罐頭了，每次一拿出來牠就搖尾巴等著吃",
      "我的毛孩超愛這罐頭食品，一吃就停不下來，每次都吃得乾乾淨淨",
      "這款罐頭真是物美價廉，我的毛孩吃了之後舔得一乾二淨，好開心！",
      "毛孩都愛的口味，我家的兩隻寶貝一人一罐，吃得津津有味",
      "這個罐頭食品真的很天然，看得到真材實料，比起其他品牌好太多了",
      "我家毛孩很挑食，但對這個罐頭卻讚不絕口，每次都吃個乾乾淨淨",
      "我的寶貝對這個罐頭愛不釋手，吃完還舔舔嘴巴，好像在回味呢！",
      "這款寵物罐頭份量十足，對於我家毛孩來說剛剛好，吃得飽飽的",
      "我的毛孩嘗過很多品牌的罐頭，但這個是牠最愛的，現在我都固定買這個了",
      "寶貝平時很挑食，但對這個罐頭完全沒有抵抗力，一口接一口",
    ];

    const SN_comment = [
      "我的寵物很挑食，但對這款零食非常喜歡，每次一拿出來就搶著吃，滿分推薦！",
      "這個寵物零食的成分很天然，讓我更安心地餵食我的寵物，而且牠也愛吃得津津有味",
      "我家寵物對於這種零食完全上癮，吃完後還會舔舔嘴巴，顯然非常滿足",
      "這款寵物零食有助於牙齒健康，我注意到寵物的口氣有所改善，真是太好了",
      "我之前嘗試過很多不同品牌的寵物零食，但這個似乎是牠們的最愛，一吃就停不下來",
      "這種寵物零食的包裝很好密封，能保持零食的新鮮和脆口，我買了好幾袋囤著",
      "我家的寵物對於這個零食特別喜歡，每次拿出來都會搖尾巴表示興奮",
      "這個寵物零食不僅外觀可愛，而且口味濃郁，是我目前為止買過最棒的零食",
      "我發現這個寵物零食對於訓練寵物時非常有效，牠願意為了這個零食而配合我",
      "這種寵物零食營養豐富，讓我的寵物保持健康的同時，也增添了牠的食慾",
    ];

    const HE_comment = [
      "我家寵物的毛髮因為這款保健品變得更加亮麗柔軟，而且我也注意到牠的皮膚狀況有改善。強烈推薦！",
      "這個寵物保健品含有豐富的維生素和葉酸，對於提升寵物的免疫力很有效果，我家的寵物已經不易生病了",
      "我的寵物年紀漸長，關節經常不舒服，但自從使用這款保健品後，牠的活動度明顯增加，再也不見牠苦惱的樣子",
      "這是我第一次給我的寵物吃保健品，幸好選對了品牌，牠吃得很開心，也看得出來更有精神了",
      "這款寵物保健品是天然植物提煉，完全沒有添加人工成分，我對於給寵物吃這個感到很放心",
      "我原本以為我的寵物不太喜歡吃保健品，但這個意外地讓牠愛上了，每天都迫不及待地想要吃",
      "這個寵物保健品對於牙齒健康很有幫助，牙石明顯減少，我再也不用為了刷牙而苦惱了",
      "這種寵物保健品對於改善寵物的消化問題非常有效，牠的胃不再那麼容易脹氣了",
      "我之前試過很多種保健品，但這個似乎是我找到的最適合我家寵物的，看來我會長期使用它",
      "這款寵物保健品是綜合營養的，各方面都照顧到了，讓我的寵物在吃了它後有了整體的改善",
    ];

    const TO_comment = [
      "這個寵物玩具是我家寵物的最愛，它喜歡追逐和咬啃這個玩具，玩得非常開心！",
      "我買了這個寵物玩具後，寵物咪整天都在拿著它玩耍，對於消磨寵物的精力很有幫助",
      "這款寵物玩具的設計很巧妙，可以激發寵物的興趣，而且材質安全無害",
      "我的兩隻毛孩都喜歡這個玩具，有時還會為了爭奪而產生一些有趣的互動",
      "這個寵物玩具非常耐咬，我家的寶貝是個大力士，但它至今都沒有被咬壞",
      "這款玩具設計簡單卻很吸引寵物，我看得出來牠在玩的時候非常開心",
      "我買了好幾個不同類型的玩具，但這個似乎是我家寵物的最愛，經常抓著它睡覺",
      "這個寵物玩具可以讓我和狗狗一起互動，增進了我們之間的感情",
      "我家的寵物對這個玩具很感興趣，它會用爪子拍打和咬啃，是個不錯的選擇",
      "玩具的尺寸適中，我可以輕鬆將它放進口袋，隨時帶著寵物外出遊玩",
    ];

    const OD_comment = [
      "這個產品非常耐用而且舒適，讓我的寵物在戶外活動時能感到愉快",
      "這款產品的設計非常貼心，讓我可以輕鬆地帶著寵物外出，牠也很喜歡",
      "有了這個產品，我帶寵物去戶外活動更加便利，省去了不少麻煩",
      "這個產品讓我更放心地帶著寵物在戶外玩耍，牠的安全總是得到保障",
      "這個產品的防水功能真是太實用了，讓我的寵物可以在戶外盡情玩水",
      "這款產品非常多功能，不僅在戶外有用，平常也能派上用場，真是物超所值",
      "這個產品設計得很方便攜帶，無論是長途旅行還是日常外出，都很適合",
      "我的寵物之前常常因為尺寸不合適而不舒服，但這個產品的尺寸可調整，很貼心",
      "這個產品讓我和寵物更加親近，共同享受戶外的美好時光",
      "這個產品適用於各種戶外情況，讓我和寵物都喜愛上了大自然",
    ];

    const OT_comment = [
      "這款寵物寢具提供超柔軟的材質和絕佳的支撐性，讓我的寵物能夠安心入睡，而且易於清潔，真是一個值得推薦的選擇。",
      "這個寵物寢具採用有機棉和天然草編織而成，對於尋求環保、無毒寢具的寵物主人來說是理想的選擇，而且也符合寵物的自然睡眠需求",
      "這款寵物寢具不僅可以作為床墊使用，還可以變換形狀成為寵物窩或者玩耍的場所，真是一個實用又有趣的寢具",
      "特別適合冬天使用的寵物寢具，它內部填充有保暖材料，讓我的寵物在寒冷的夜晚也能感到溫暖和舒適",
      "這個寵物寢具表面採用防水防污材質，從現在再也不用擔心寵物弄髒或弄濕了，清潔也變得輕鬆簡單",
      "這款寵物寢具使用了高級的記憶棉材料，給予我的寵物最佳的身體支撐，同時材質非常耐用，是一個值得投資的選擇",
      "寵物寢具上設有可愛的玩具或者活動設計，使寵物在休息之餘也能享受一些遊樂時光，增加生活樂趣",
      "這個特殊設計的寵物寢具可以摺疊或者疊放，節省了存放空間，非常適合小空間居住的寵物家庭",
      "寵物寢具上採用了抗菌處理，有效抑制細菌滋生，為寵物的健康提供了更好的保護",
      "這個寵物寢具經過嚴格的質量測試，符合相關安全標準，讓我對寵物的安全感到放心",
    ];

    const DR_comment = [
      "這款寵物衣服不僅款式時尚，而且使用高品質的棉質材料，讓我的寵物在穿著時感到舒適自在",
      "特別適合寒冷季節的寵物衣服，內部加厚保暖材料，讓我的寵物在寒冷的天氣裡保持溫暖",
      "專為夏季設計的寵物衣服，使用透氣的材料，讓我的寵物在炎熱的天氣裡也能保持涼爽",
      "這個寵物衣服採用彈性材料，貼身又不緊繃，讓我的寵物在穿著時有更好的活動自由",
      "這款寵物衣服結合了功能性和時尚性，例如具有雨衣功能或者可換式的配件，增加了使用價值",
      "這個寵物衣服經過環保材料測試，沒有有害物質，給我的寵物健康提供了保護",
      "設計簡單易穿脫的寵物衣服，讓我不必花太多時間幫寵物穿衣服，寵物也更願意配合",
      "這個寵物衣服有著可愛的圖案或者造型，讓我的寵物看起來更加討人喜歡",
      "根據寵物的尺寸設計，這款寵物衣服無論是小型犬還是大型貓，都能找到適合的尺碼",
      "這款寵物衣服容易清洗，可以機洗或手洗，讓我能夠輕鬆保持寵物的衛生和整潔",
    ];

    // if (doInsert > 0.5) {
    const create_member = `mem00${Math.ceil(Math.random() * 500)
      .toString()
      .padStart(3, "0")}`;
    const rating = Math.floor(Math.random() * 3) + 3;
    const startDate = new Date("2023-01-01").getTime();
    const endDate = new Date("2023-07-25").getTime();
    const randomDate = res.toDatetimeString(
      Math.random() * (endDate - startDate) + startDate
    );
    const commentArray = eval(`${category}_comment`);
    const sql = `INSERT INTO shop_comment 
      (order_detail_sid, product_sid, member_sid, date, rating, content) VALUES 
      (?,?,?,?,?,?)`;

    const [result] = await db.query(sql, [
      v.order_detail_sid,
      v.rel_sid,
      create_member,
      randomDate,
      rating,
      commentArray[selectIndex],
    ]);
  }
  // }

  res.json(selectIndex);
});



module.exports = router;
