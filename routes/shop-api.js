const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get('/hompage-cards',async (req,res)=>{
    //給首頁新品卡片的路由
 
    //取首頁新品卡片資訊
    const sql_newData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
    GROUP BY p.product_sid
    ORDER BY update_date DESC
    LIMIT 0, 23`
    const [newData]=await db.query(sql_newData);

    //取首頁供應商卡片資訊
    const sql_brandData=`SELECT * FROM shop_supplier LIMIT 0, 15`
    const [brandData]=await db.query(sql_brandData)

    //取首頁汪星人卡片資訊
    const sql_dogData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='D'
    GROUP BY p.product_sid
    LIMIT 0, 23`
    const [dogDatas]=await db.query(sql_dogData)

    //取首頁喵星人卡片資訊
    const sql_catData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='C'
    GROUP BY p.product_sid
    LIMIT 0, 23`
    const [catDatas]=await db.query(sql_catData)

    res.json({dogDatas,catDatas,brandData,newData})
})

router.get('/products',async(req,res)=>{
    let output={
        // redirect: "",
        totalRows:0,
        perPage:16,
        totalPages:0,
        page:1,
        rows:[],
    };

    const dict={
        food:'FE',
        can:'CA',
        snack:'SN',
        health:'HE',
        dress:'DR',
        outdoor:'OD',
        toy:'TO',
        other:'OT',
        price_ASC:'min_price ASC' ,
        price_DESC:'min_price DESC',
        new_DESC:'shelf_date DESC',
        sales_DESC:'min_price DESC',

    }


    // const perPage=16;
    let perPage=req.query.perPage || 16;
    let keyword=req.query.keyword || "";
    let category=req.query.category || "";
    let orderBy=req.query.orderBy||"new_DESC";
    let page=req.query.page? parseInt(req.query.page):1;

    if(!page||page<1){
        page=1
        // output.redirect=req.baseUrl;
        // return res.json(output);
    }
    
    //queryString條件判斷
    let where=' WHERE 1 ';
    

    if(category){
        // let cat_escaped=db.escape("%" + category + "%");
        const cat_escaped=dict[category]
        where+=` AND p.category_detail_sid = "${cat_escaped}" `
    };
    if(keyword){
        let keyword_escaped=db.escape("%" + keyword + "%");
        where+=` AND p.name LIKE ${keyword_escaped} `
    }

    //queryString排序判斷
    let order=' ORDER BY '
    const order_escaped=dict[orderBy]
    order+=` ${order_escaped} `



    //進資料庫拉資料---------------

    //取得總筆數資訊
    const sql_totalRows=`SELECT COUNT(1) totalRows FROM shop_product p ${where}`;
    const [[{totalRows}]]=await db.query(sql_totalRows);
    let totalPages=0;
    let rows=[];

    

    //有資料時
    if(totalRows){
        //取得總頁數
        totalPages=Math.ceil(totalRows/perPage);
        
        if(page>totalPages){
            page=totalPages;
            // output.redirect=`${req.baseUrl}?page=${totalPages}`;
            // return res.json(output);
        };
        //確定要查詢的頁碼資料比總頁數小，才去拉資料
        const sql=`SELECT p.*, s.name supplier, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
        FROM shop_product p
        LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
        ${where}
        GROUP BY p.product_sid
        ${order}
        LIMIT ${perPage*(page-1)}, ${perPage}
        `;

        [rows]=await db.query(sql);
    }
    
    //將得到的資料的日期轉換為當地格式
    rows.forEach((v)=>{
        v.shelf_date=res.toDatetimeString(v.shelf_date)
        v.update_date=res.toDatetimeString(v.update_date)
    })
    
    
    //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
    const sql_likeList=`SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_like l
    JOIN shop_product p ON p.product_sid=l.product_sid
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE member_sid='mem00002'
    GROUP BY p.product_sid
    ORDER BY date DESC`
    const [likeDatas]=await db.query(sql_likeList)

    likeDatas.forEach((v)=>{
        v.date=res.toDateString(v.date)
    })

    //依據類別給回傳篩選時有哪幾家品牌
    const sql_brand=`SELECT s.name label, s.supplier_sid value
    FROM shop_product p
    JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
    WHERE p.category_detail_sid = "${category}"
    GROUP BY p.supplier_sid
    ORDER BY s.name ASC`

    const [brand]=await db.query(sql_brand)




    
    output={...output, totalRows, perPage, totalPages, page, rows,likeDatas,brand}
    console.log(totalRows, perPage, totalPages, page)
    return res.json(output)
})



router.get('/product/:product_sid',async (req,res)=>{
    //給細節頁(商品資訊)的路由

    const {product_sid}=req.params


    //取得商品主要資訊
    const sql_productMainData=`SELECT p.*, s.name supplier_name, s.made_in_where, ROUND(AVG(c.rating), 1) avg_rating, COUNT(c.rating) comment_count
        FROM shop_product p
        JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
        WHERE p.product_sid="${product_sid}"`
   
        let [shopMainData]=await db.query(sql_productMainData)
        //return res.json(shopMainData)
        

    //將麵包屑中文與前端路由英文的產品類別轉換放置商品主要資訊
    const dict={
        CA:['罐頭','can'],
        FE:['飼料','food'],
        SN:['零食','snack'],
        HE:['保健品','health'],
        DR:['服飾','dress'],
        OD:['戶外用品','outdoor'],
        TO:['玩具','toy'],
        OT:['其他','other']}
    const catergory_chinese_name=dict[shopMainData[0].category_detail_sid][0]
    const catergory_english_name=dict[shopMainData[0].category_detail_sid][1]
    shopMainData[0].catergory_chinese_name=catergory_chinese_name
    shopMainData[0].catergory_english_name=catergory_english_name
    
    //取得細項規格的資訊
    const sql_productDetailData=`SELECT * FROM shop_product_detail WHERE product_sid="${product_sid}"`

    let [shopDetailData]=await db.query(sql_productDetailData)

    //須將價格區間、主商品照片細項規格合併
    //1.取得價格區間
    const prices=shopDetailData.map(v=>v.price)
    const maxPrice=Math.max(...prices)
    const minPrice=Math.min(...prices)
    let priceRange;
    if(maxPrice!==minPrice){
        priceRange=`${minPrice} ~ ${maxPrice}`
    }else{
        priceRange=minPrice
    }
    //2.取得主商品照片
    const [{img:mainImg}]=shopMainData
    //3.將上述資訊結合成預設資訊
    const defaultObj={
        product_detail_sid:'00',
        product_sid:product_sid,
        name:'default',
        price:priceRange,
        qty:0,
        img:mainImg,
        for_age:0
    }

    //4.將預設資訊與細項規格合併
    shopDetailData=[defaultObj,...shopDetailData]


    //取得評價資訊，還需要修改，因為要join member的表格
    const sql_commentDatas=`SELECT c.*, m.name, m.profile
    FROM shop_comment c
    LEFT JOIN member_info m ON m.member_sid=c.member_sid
    WHERE product_sid="${product_sid}" ORDER BY c.date DESC`

    const [commentDatas]=await db.query(sql_commentDatas)

    //將卡片內的日期轉換為當地格式
    commentDatas.forEach((v)=>{
    v.date=res.toDateString(v.shelf_date)
    })

    //取得該商品各項評分的筆數
    const sql_commentQtyForEach=`SELECT rating, COUNT(*) count
    FROM shop_comment
    WHERE product_sid = "${product_sid}"
    GROUP BY rating ORDER BY rating DESC`

    const [commentEachQty]=await db.query(sql_commentQtyForEach)


    //依據客戶所查的商品，用寵物類別隨機推薦商品給客戶
    const customerLookforPet=shopMainData[0].for_pet_type
    const sql_reccomandData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='${customerLookforPet}'
    GROUP BY p.product_sid
    ORDER BY RAND()
    LIMIT 24`
    const [reccomandData]=await db.query(sql_reccomandData)


    //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
    const sql_likeList=`SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
    FROM shop_like l
    JOIN shop_product p ON p.product_sid=l.product_sid
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    WHERE member_sid='mem00002'
    GROUP BY p.product_sid
    ORDER BY date DESC`
    const [likeDatas]=await db.query(sql_likeList)

    likeDatas.forEach((v)=>{
        v.date=res.toDateString(v.date)
    })

     res.json({shopMainData, shopDetailData,commentDatas,commentEachQty,reccomandData,likeDatas})
})


router.get ('/maincard/:cat', async(req,res)=>{
    const {cat}=req.params

    //製作類別字典，以判斷動態路由，所選擇責的類別
    const dict={
        can:['category_detail_sid','CA'],
        food:['category_detail_sid','FE'],
        snack:['category_detail_sid','SN'],
        health:['category_detail_sid','HE'],
        dress:['category_detail_sid','DR'],
        outdoor:['category_detail_sid','OD'],
        toy:['category_detail_sid','TO'],
        other:['category_detail_sid','OT']}

    //取得卡片資訊
    const sql_cardData=`SELECT p.*, s.name supplier, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
        FROM shop_product p
        LEFT JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE ${dict[cat][0]}='${dict[cat][1]}'
        GROUP BY p.product_sid
        LIMIT 0, 15`
        const [cardData]=await db.query(sql_cardData)
        console.log(cardData)

    //將卡片內的日期轉換為當地格式
    cardData.forEach((v)=>{
            v.shelf_date=res.toDatetimeString(v.shelf_date)
            v.update_date=res.toDatetimeString(v.update_date)
        })
    
    //取得總筆數資訊
    const sql_totalRows=`SELECT COUNT(1) totalRows FROM shop_product WHERE ${dict[cat][0]}='${dict[cat][1]}'`
    const [[{totalRows}]]=await db.query(sql_totalRows)


    //取得某一個會員的喜愛清單(這邊需要再修改，要看怎樣取得mem的編號
        const sql_likeList=`SELECT l.*, p.name, p.img, MAX(ps.price) max_price, MIN(ps.price) min_price
        FROM shop_like l
        JOIN shop_product p ON p.product_sid=l.product_sid
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        WHERE member_sid='mem00002'
        GROUP BY p.product_sid
        ORDER BY date DESC`
        const [likeDatas]=await db.query(sql_likeList)

        likeDatas.forEach((v)=>{
            v.date=res.toDateString(v.date)
        })

    //依據類別給回傳篩選時有哪幾家品牌
    const sql_brandDatas=`SELECT s.name label, s.supplier_sid value
    FROM shop_product p
    JOIN shop_supplier s ON s.supplier_sid=p.supplier_sid
    WHERE ${dict[cat][0]}='${dict[cat][1]}'
    GROUP BY p.supplier_sid
    ORDER BY s.name ASC`

    const [brandDatas]=await db.query(sql_brandDatas)

    res.json({totalRows,cardData,likeDatas, brandDatas})
        // data.forEach(i=>{
        //     i.birthday = res.toDatetimeString(i.birthday)
        //     i.created_at = res.toDatetimeString(i.created_at)
        // });
        // res.json(data)
})

//刪除收藏清單的API
router.delete("/likelist/:pid/:mid",async(req,res)=>{
    const { pid, mid } =req.params;
    let sql_deleteLikeList="DELETE FROM `shop_like` WHERE ";
    if (pid==='all'){
        sql_deleteLikeList+=`member_sid = '${mid}'`
    }else{
        sql_deleteLikeList+=`member_sid = '${mid}' AND product_sid='${pid}'`
    }

    try {
        const [result] = await db.query(sql_deleteLikeList);
        res.json({ ...result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred' });
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
})




module.exports = router;