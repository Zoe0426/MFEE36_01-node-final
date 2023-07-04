const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

router.get('/new',async (req,res)=>{
    //給首頁新品卡片的路由
 
    //取得卡片資訊
    const sql_newData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
    FROM shop_product p
    LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
    LEFT JOIN shop_comment c ON p.product_sid=c.product_sid 
    GROUP BY p.product_sid
    ORDER BY update_date DESC
    LIMIT 0, 23`
    const [newData]=await db.query(sql_newData)

    res.json(newData)
})


router.get('/brand',async (req,res)=>{
    //給首頁品牌(供應商)卡片的路由

    //取得卡片資訊
    const sql_supplierData=`SELECT * FROM shop_supplier LIMIT 0, 15`
        const [supplierData]=await db.query(sql_supplierData)
    res.json(supplierData)
})

router.get('/comment/:product_sid',async (req,res)=>{
    //給細節頁(評價)卡片的路由

    const {product_sid}=req.params

    //取得卡片資訊，還需要修改，因為要join member的表格
    const sql_commentData=`SELECT c.*, m.name, m.profile
        FROM shop_comment c
        LEFT JOIN member_info m ON m.member_sid=c.member_sid
        WHERE product_sid="${product_sid}" ORDER BY c.date DESC LIMIT 0, 14`
   
        const [commentData]=await db.query(sql_commentData)

    //將卡片內的日期轉換為當地格式
    commentData.forEach((v)=>{
        v.date=res.toDateString(v.shelf_date)
    })

    res.json(commentData)
})

router.get('/product/:product_sid',async (req,res)=>{
    //給細節頁(商品資訊)的路由

    const {product_sid}=req.params


    //取得商品主要資訊
    const sql_productMainData=`SELECT p.*, s.name supplier_name, s.made_in_where
        FROM shop_product p
        JOIN shop_supplier s ON s.supplier_sid = p.supplier_sid
        WHERE product_sid="${product_sid}"`
   
        const [shopMainData]=await db.query(sql_productMainData)

    //取得細項規格的資訊
    const sql_productDetailData=`SELECT * FROM shop_product_detail WHERE product_sid="${product_sid}"`

    const [shopDetailData]=await db.query(sql_productDetailData)

    //將照片合併
    const [{img}]=shopMainData
    let allImg=[];
    allImg.push(img)
 
    shopDetailData.forEach((v)=>{
        allImg.push(v.img)
    })

    //取得最高與最低價，並合併
    const prices=shopDetailData.map(v=>v.price)
    const maxPrice=Math.max(...prices)
    const minPrice=Math.min(...prices)
    let priceRange;
    if(maxPrice!==minPrice){
        priceRange=`${minPrice}~${maxPrice}`
    }else{
        priceRange=minPrice
    }
    const allPrice=[];
    allPrice.push(priceRange)
    shopDetailData.forEach((v)=>{
        allPrice.push(v.price)
    })
     res.json({shopMainData, shopDetailData,allImg,allPrice})
})


router.get('/:petType',async (req,res)=>{
    //給首頁貓狗卡片的路由

    const {petType}=req.params

    //return res.json(req.params)

    //製作類別字典，以判斷動態路由，所選擇責的類別
    const dict={
        dog:"D",
        cat:"C"}

    //取得卡片資訊
    const sql_cardData=`SELECT p.*, MAX(ps.price) max_price, MIN(ps.price) min_price, ROUND(AVG(c.rating), 1) avg_rating
        FROM shop_product p
        LEFT JOIN shop_product_detail ps ON p.product_sid=ps.product_sid
        LEFT JOIN shop_comment c ON p.product_sid=c.product_sid WHERE for_pet_type='${dict[petType]}'
        GROUP BY p.product_sid
        LIMIT 0, 23`
        const [cardData]=await db.query(sql_cardData)
    res.json(cardData)
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
        other:['category_detail_sid','OT'],
        dog:['for_pet_type','D'],
        cat:['for_pet_type','C'] }

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