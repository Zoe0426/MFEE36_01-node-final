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


router.get('/product/:product_sid',async (req,res)=>{
    //給細節頁(商品資訊)的路由

    const {product_sid}=req.params


    //取得商品主要資訊
    const sql_productMainData=`SELECT p.*, s.name supplier_name, s.made_in_where, ROUND(AVG(c.rating), 1) avg_rating
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
    WHERE product_sid="${product_sid}" ORDER BY c.date DESC LIMIT 0, 14`

    const [commentDatas]=await db.query(sql_commentDatas)

    //將卡片內的日期轉換為當地格式
    commentDatas.forEach((v)=>{
    v.date=res.toDateString(v.shelf_date)
    })

    res.json({shopMainData, shopDetailData,commentDatas})
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


    res.json({totalRows,cardData})
        // data.forEach(i=>{
        //     i.birthday = res.toDatetimeString(i.birthday)
        //     i.created_at = res.toDatetimeString(i.created_at)
        // });
        // res.json(data)
})

module.exports = router;