const express = require('express');
const createLinePayClient = require('line-pay-merchant').createLinePayClient;
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 
const { v4: uuid } = require('uuid');

const options = {
    "OperationMode": "Test", //Test or Production
    "MercProfile": {
        "MerchantID": "2000132",
        "HashKey": "5294y06JbISpM5x9",
        "HashIV": "v77hoKGq4kWxNNIS"
    },
    "IgnorePayment": [
        //    "Credit",
        "WebATM",
        "ATM",
        "CVS",
        "BARCODE",
        //    "AndroidPay"
    ],
    "IsProjectContractor": false
}
const ECPayPayment = require('ecpay_aio_nodejs/lib/ecpay_payment');
const ecpayPayment = new ECPayPayment(options);
const linePayClient = createLinePayClient({
  channelId: '1657486223', // channel ID
  channelSecretKey: 'a71103a6d1f405d02429e09c22e72f0f', // channel secret key
  env: 'development' // env can be 'development' or 'production'
})

const getNewOrderSid = async () => {
    try {
        const sqlHead = "SELECT MAX(order_sid) as maxSid FROM `order_main`";
        const [maxSid] = await db.query(sqlHead);
        if (maxSid[0].maxSid === null) { 
        return 'ORD00001';
        } else { 
        const newOrdNum = parseInt(maxSid[0].maxSid.substring(3)) + 1;
        const newOrdersid = `ORD${newOrdNum.toString().padStart(5, '0')}`;
        return newOrdersid;
        }
    } catch (error) {
        console.error(error);
        throw new Error('取訂單編號時出錯');
    }
}
const updateCouponStatus = async(couponSendSid, status)=>{
    //status: 0=>unused, 1=>used
try{
    const updateCouponSql = `UPDATE member_coupon_send
                            SET 
                                coupon_status = ?,
                                used_time = now()
                            WHERE
                                coupon_send_sid = ?`    
    const [updateCouponResult] = await db.query(updateCouponSql,[status, couponSendSid]);
    return updateCouponResult.affectedRows? 'success' : 'failed';

    }catch(error){
        console.error(error);
        throw new Error('更新優惠券狀態時出錯');
    }
}
const updateShopQty = async(shopItems)=>{
    try{
        const result = [];
        for(let item of shopItems){
            const {rel_sid, prod_qty} = item;
            const updateShopQtySql =`UPDATE shop_product
                    SET sales_qty = IFNULL(sales_qty, 0) + ?
                    WHERE product_sid = ?`;
        const [updateShopQtyResult] = await db.query(updateShopQtySql,[prod_qty, rel_sid]);
        result.push(updateShopQtyResult.affectedRows);
        //console.log("updateShopQtyResult:" ,result);
        }
        return result.includes(0)?'failed': 'success';

    }catch(error){
        console.error(error);
        throw new Error('更商品購買數量時出錯');
    }
}
const updateCart = async(cartItems)=>{
    //cartItems: [{cart_sid:xxx, order_status:xxx}]
    //status: 001=>cart, 002=>order, 003=>delete
    try{
        const result = [];
        for(let item of cartItems){
            const {cart_sid, order_status} = item;
            const updateCartSql = `UPDATE
                                    order_cart
                                SET
                                    order_status = ?
                                WHERE
                                    cart_sid = ?`    
        const [updateCartSqlResult] = await db.query(updateCartSql,[order_status, cart_sid]);
        result.push(updateCartSqlResult.affectedRows);
        //console.log("updateCartResult:" ,result);
        }
        return result.includes(0)?'failed': 'success';

    }catch(error){
        console.error(error);
        throw new Error('更新購物車商品狀態時出錯');
    }
}
const createOrder = async(data)=>{
    const createOrderResult = {
        createOrderSuccess :false,
        orderSid: "",
        finalTotal:0
    }
    const result = {
        addtoOrdermain: false,
        addtoOrderdetail:false,
        cartUpdated:false,
    };
    //準備sql所需資料
    const newOrderSid = await getNewOrderSid();
    const {checkoutType, paymentType, checkoutItems, couponInfo,postInfo, member_sid} = data;
   // console.log('createorder Data', data);
    //coupon
    const coupon_send_sid = (couponInfo.length)? couponInfo[0].coupon_send_sid: '';
    const couponPrice = (couponInfo.length)? couponInfo[0].price: 0;
    //send to 
    const sendto = (postInfo.length)?postInfo.filter(v=>v.selected)[0]:postInfo;
    const recipient= (postInfo.length)?sendto.recipient:null;
    const recipient_phone= (postInfo.length)?sendto.recipient_phone:null;
    const post_type= (postInfo.length)?sendto.post_type:null;
    const store_name= (postInfo.length)?sendto.store_name:null;
    const post_amount = (postInfo.length)?(sendto.post_type ===1? 90 : 60 ): 0; 
    const post_address = (postInfo.length)? (sendto.city+sendto.area+sendto.address): null;
    const post_status = checkoutType === 'shop'? 1: 5;
    const subtotal = checkoutItems.reduce((a, v) => {
      const sub = (v.prod_price * v.prod_qty)+ (v.adult_price * v.adult_qty)+ (v.child_price * v.child_qty);
      return a + sub;
    }, 0);

    const orderItems = checkoutType === 'shop'
    ? checkoutItems.map(v=>({...v, 'rel_subtotal':v.prod_price*v.prod_qty}))
    : checkoutItems.map(v=>({...v, 'rel_subtotal':(v.adult_price*v.adult_qty)+(v.child_price*v.child_qty)}));

    const updateCartData = checkoutItems.map(v=>({'cart_sid' :v.cart_sid,'order_status':'002'}));
    createOrderResult.orderSid = newOrderSid;
    createOrderResult.finalTotal= subtotal + post_amount - couponPrice;
    //TODO: 把body 裡的資料去資料庫拿正式的價錢再create order
    //新增到訂單-父表
    try{
        const orderMainSql = `INSERT INTO
            order_main(
                order_sid, member_sid, coupon_send_sid,
                recipient, recipient_phone, post_type,
                post_store_name, post_address, post_status, 
                tread_type, rel_subtotal, post_amount,
                coupon_amount,order_status, 
                create_dt
            )
            VALUES
                (?,?,?,
                ?,?,?,
                ?,?,?,
                ?,?,?,
                ?,?,now()
                )`
        const [orderMainresult] = await db.query(orderMainSql,[
            newOrderSid,member_sid,coupon_send_sid,
            recipient,recipient_phone,post_type,
            store_name, post_address , post_status, 
            paymentType, subtotal, post_amount,
            couponPrice, 0])
        orderMainresult.affectedRows && (result.addtoOrdermain = true);
    }catch(error){
        console.error(error);
        throw new Error('加父表格時出錯');
    }
      //新增到訂單明細-子表
    try{
        for(let item of orderItems){
            const orderDetailSql = `INSERT INTO
                    order_details(
                        order_sid, rel_type, rel_sid,
                        rel_seq_sid, rel_name, rel_seq_name,
                        product_price, product_qty, adult_price,
                        adult_qty, child_price, child_qty,
                        rel_subtotal
                    )
                    VALUES
                        (?,?,?,
                        ?,?,?,
                        ?,?,?,
                        ?,?,?,
                        ?)`
            const {rel_sid, rel_seq_sid,rel_name,rel_seq_name,prod_price,prod_qty,adult_price,adult_qty,child_price,    child_qty,rel_subtotal}=item;  

            const [orderDetailresult] = await db.query(orderDetailSql,[
                    newOrderSid,checkoutType,rel_sid, 
                    rel_seq_sid,rel_name,rel_seq_name,
                    prod_price,prod_qty,adult_price,
                    adult_qty,child_price, child_qty,
                    rel_subtotal])

            orderDetailresult.affectedRows &&  (result.addtoOrderdetail = true);
     }
        }catch(error){
        console.error(error);
        throw new Error('加子表格時出錯');
    }
    //有使用coupon的話更新狀態
    if(coupon_send_sid){
        const updateCouponResult = await updateCouponStatus(coupon_send_sid, 1);
        updateCouponResult === 'success'? (result.couponUpdated = true):(result.couponUpdated = false);
    }
    if(checkoutType==='shop'){
        //TODO:更新預設地址
        //UPDATE SHOP QTY
        const updateShopQtyResult = await updateShopQty(checkoutItems);
        updateShopQtyResult === 'success'? (result.prodQtyUpdated = true): (result.prodQtyUpdated = false);
    }
    const updateCartResult = await updateCart(updateCartData);
    updateCartResult === 'success'? (result.cartUpdated = true):(result.cartUpdated = false);
    //更新購物車
    if(coupon_send_sid){
        (result.addtoOrdermain && result.addtoOrderdetail && result.cartUpdated && result.couponUpdated)? createOrderResult.createOrderSuccess = true: createOrderResult.createOrderSuccess = false;
    }else{
        (result.addtoOrdermain && result.addtoOrderdetail && result.cartUpdated )? createOrderResult.createOrderSuccess = true: createOrderResult.createOrderSuccess = false;
    }
    console.log(result);
    console.log(createOrderResult);

    return createOrderResult;
}
const paymentSucceeded=async(data,res)=>{
    const {CustomField1,CustomField2, CustomField3}= data;
    //CustomField1:orderSid, CustomField2:checkoutType ,CustomField3:memberSid
    try {
        const updateOrderSql = `UPDATE
                                    order_main
                                SET
                                    order_status = ?
                                WHERE
                                    order_sid = ?;` 
        
        const [updateOrderResult] = await db.query(updateOrderSql, [1,CustomField1]);
        if(updateOrderResult.affectedRows){
            console.log('redirect to:', `http://localhost:3000/cart/order-complete?orderSid=${CustomField1}&checkoutType=${CustomField2}&memberSid=${CustomField3}`)
            res.redirect(`http://localhost:3000/cart/order-complete?orderSid=${CustomField1}&checkoutType=${CustomField2}&memberSid=${CustomField3}`);
        }else{
            //res.redirect(`http://localhost:3000/cart/order-complete?orderSid=${CustomField1}&checkoutType=${CustomField2}&memberSid=${CustomField3}`);
                //res.send(req.body.CustomField1);
                //console.log(req.body);
        }
    } catch(error) { console.error(error);
        throw new Error('update order status failed 更新訂單狀態失敗');
    }
}
const paymentFailed = async(data,res)=>{
    const {CustomField1,CustomField2, CustomField3}= data;
     //CustomField1:orderSid, CustomField2:checkoutType ,CustomField3:memberSid
    res.redirect(`http://localhost:3000/cart/repay/${CustomField1}`);
}
const getOrderDetail = async(orderSid)=>{
    const output = {checkoutType:'', details:[]}
 try{
        const getOrderDetailSql = `SELECT
                od.order_detail_sid as order_detail_sid,
                sp.product_sid as rel_sid,
                sp.name as rel_name,
                spd.product_detail_sid as rel_seq_sid,
                spd.name as rel_seq_name,
                spd.price as prod_price,
                od.product_qty as prod_qty,
                od.rel_type as rel_type,
                0 as adult_price,
                0 as child_price,
                0 as adult_qty,
                0 as child_qty,
                sp.img as img
            FROM
                order_details od
                JOIN shop_product sp ON od.rel_sid = sp.product_sid
                JOIN shop_product_detail spd ON sp.product_sid = spd.product_sid
                AND od.rel_seq_sid = spd.product_detail_sid
            WHERE
                od.order_sid = ?
            UNION
            ALL
            SELECT
                od.order_detail_sid as order_detail_sid,
                ai.activity_sid as rel_sid,
                ai.name as rel_name,
                ag.activity_group_sid as rel_seq_sid,
                ag.date as rel_seq_name,
                0 as prod_price,
                0 as prod_qty,
                od.rel_type as rel_type,
                ag.price_adult as adult_price,
                ag.price_kid as child_price,
                od.adult_qty as adult_qty,
                od.child_qty as child_qty,
                ai.activity_pic as img
            FROM
                order_details od
                JOIN activity_info ai ON od.rel_sid = ai.activity_sid
                JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
                AND od.rel_seq_sid = ag.activity_group_sid
            WHERE
                od.order_sid = ?`;
        const [details] = await db.query(getOrderDetailSql, [orderSid,orderSid]);
        output.details = details.map(v=>({...v,img:(v.img).split(',')[0]}));
        output.checkoutType = details[0].rel_type;
        

    }catch(error){
        console.error(error);
        throw new Error('取商品資料時出錯');
    }
    return output;
}
const getCouponData = async(csSid, res)=>{
     try{
        const getCouponDetailSql = `SELECT
            mcs.member_sid,
            mcs.coupon_sid,
            mcs.coupon_send_sid,
            mcc.name,
            mcc.price,
            mcc.exp_date,
            mcs.coupon_status
        FROM
            member_coupon_send mcs
            JOIN member_coupon_category mcc 
            ON mcs.coupon_sid = mcc.coupon_sid
        WHERE
           mcs.coupon_send_sid = ?`;
        const [details] = await db.query(getCouponDetailSql, [csSid]);
        const sortedData = details.map(v=>({...v, exp_date: res.toDateString(v.exp_date) }))
        return sortedData;

    }catch(error){
        console.error(error);
        throw new Error('取商品資料時出錯');
    }
}
router.post ('/get-cart-items', async(req,res)=>{
    let output ={
        shop : [],
        activity : [],
        postAddress:[],
        coupon:[],
    }
    const memberSid = req.body.member_sid;
    //const today = res.toDateString(new Date())
    //=====getEmail=====
    try{
        const getEmailSql = `SELECT email FROM member_info WHERE member_sid = ?`;
        const [emailData] = await db.query(getEmailSql,[memberSid]);
        //console.log(emailData);
        output.email = emailData[0].email;
    }catch(error){
        console.error(error);
        throw new Error('取email時出錯');
    }
    //=====getCartItems=====
    try{
        const getCartItemSql = `SELECT sortedData.* FROM (SELECT
                oc.cart_sid as cart_sid,
                sp.product_sid as rel_sid,
                sp.name as rel_name,
                spd.product_detail_sid as rel_seq_sid,
                spd.name as rel_seq_name,
                spd.price as prod_price,
                oc.product_qty as prod_qty,
                oc.rel_type as rel_type,
                0 as adult_price, 0 as child_price,
                0 as adult_qty,
                0 as child_qty,
                sp.img as img,
                oc.added_time
            FROM
                order_cart oc
                JOIN shop_product sp ON oc.rel_sid = sp.product_sid
                JOIN shop_product_detail spd ON sp.product_sid = spd.product_sid
                AND oc.rel_seq_sid = spd.product_detail_sid
            WHERE
                oc.member_sid = ? 
                AND oc.order_status = '001'
            UNION
            ALL 
            SELECT
                oc.cart_sid as cart_sid,
                ai.activity_sid as rel_sid,
                ai.name as rel_name,
                ag.activity_group_sid as rel_seq_sid,
                ag.date as rel_seq_name,
                0 as prod_price,
                0 as prod_qty,
                oc.rel_type as rel_type,
                ag.price_adult as adult_price,
                ag.price_kid as child_price,
                oc.adult_qty as adult_qty,
                oc.child_qty as child_qty,
                ai.activity_pic as img,
                oc.added_time 
            FROM
                order_cart oc
                JOIN activity_info ai ON oc.rel_sid = ai.activity_sid
                JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
                AND oc.rel_seq_sid = ag.activity_group_sid
            WHERE
                oc.member_sid = ? 
                AND oc.order_status = '001'
                )sortedData ORDER BY added_time DESC`;
                //console.log(getCartItemSql);
        const [cartData] = await db.query(getCartItemSql,[memberSid,memberSid]);
        //console.log(cartData);
        output.shop = cartData.filter(p=>p.rel_type === "shop");
        const actData = cartData.filter(p=>p.rel_type === "activity")
        output.activity = actData.map(p=>({...p, img : (p.img.split(',')[0])}))
    }catch(error){
        console.error(error);
        throw new Error('取購物車資料時出錯');
    }

    //=====getHistoryPostDetails=====
    try{
        const getAddressSql = `SELECT
            ma.*,
            mi.email
        FROM
            member_address ma
            JOIN member_info mi ON ma.member_sid = mi.member_sid
        WHERE
            ma.member_sid = ? 
        ORDER BY 
            CASE
                WHEN ma.default_status = 1 THEN default_status
                ELSE NULL
            END DESC,
            ma.create_time DESC`;
    const [postData] = await db.query(getAddressSql,[memberSid]);
    //console.log(postData);
    output.postAddress =  postData;
    }catch(error){
        console.error(error);
        throw new Error('取地址時出錯');
    }

    //=====getUsableCoupon=====
    try{
        const getCouponSql =  `SELECT
            mcs.member_sid,
            mcs.coupon_sid,
            mcs.coupon_send_sid,
            mcc.name,
            mcc.price,
            mcc.exp_date,
            mcs.coupon_status
        FROM
            member_coupon_send mcs
            JOIN member_coupon_category mcc 
            ON mcs.coupon_sid = mcc.coupon_sid
        WHERE
            mcs.member_sid = ?
            AND mcs.coupon_status = 0
            AND mcc.exp_date > CURDATE()
        ORDER BY
            mcc.exp_date ASC`;
    const [couponData] = await db.query(getCouponSql,memberSid);
    couponData.map(d=>d.exp_date = res.toDateString(d.exp_date))
    output.coupon = couponData;
    }catch(error){
        console.error(error);
        throw new Error('取優惠券時出錯');
    }
    
    //console.log(output)
    res.json(output);
})
router.get('/get-home-data', async(req,res)=>{
        let output ={
        shop : [],
        activity : [],
        activityImgs:[],
        restaurant:[],
        forum:[],
    }

    try{
        const getShopDataSql = `SELECT p.product_sid, p.name, p.img, p.sales_qty, p.avg_rating,
            (SELECT MIN(price) FROM shop_product_detail WHERE product_sid = p.product_sid) AS min_price,
            (SELECT MAX(price) FROM shop_product_detail WHERE product_sid = p.product_sid ) AS max_price, c.detail_name
        FROM shop_category AS c
        JOIN (SELECT * FROM shop_product
        WHERE (category_detail_sid, sales_qty) IN (
                SELECT category_detail_sid, MAX(sales_qty)
                FROM shop_product
                GROUP BY category_detail_sid
                )
            ) AS p ON c.category_detail_sid = p.category_detail_sid
        ORDER BY p.sales_qty DESC;`;
        const [shopRows] = await db.query(getShopDataSql);
        const uniqueData = shopRows.reduce((acc, curr) => {
        const existingDetailName = acc.find(item => item.detail_name === curr.detail_name);
        if (!existingDetailName) {
             acc.push(curr);
        }
        return acc;
        }, []);
        const useRows = uniqueData.slice(0,6);
        const sortedUseRows = useRows.map(v=>({...v,sales_qty:parseInt(v.sales_qty) }))
        output.shop = sortedUseRows;
    }catch(error){
        console.error(error);
        throw new Error('取商品資料時出錯');
    }
    try{
        const getActivityDataSql = `SELECT
            top4act.rel_sid AS activity_sid,
            top4act.total_qty AS total_quantity,
            ai.name,
            ai.content,
            ai.city,
            ai.area,
            ai.activity_pic,
            MAX(ag.date) AS eventEnd,
            MIN(ag.date) AS eventStart,
            GROUP_CONCAT(DISTINCT af.name) AS rules
        FROM
            (
                SELECT rel_sid, SUM(adult_qty) + SUM(child_qty) AS total_qty
                FROM order_details
                WHERE rel_type = 'activity'
                GROUP BY rel_sid
                ORDER BY total_qty DESC
                LIMIT 4
            ) top4act
        JOIN activity_info ai ON top4act.rel_sid = ai.activity_sid
        JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
        JOIN activity_feature_with_info afw ON ai.activity_sid = afw.activity_sid
        JOIN activity_feature af ON afw.activity_feature_sid = af.activity_feature_sid
        GROUP BY
            top4act.rel_sid,
            top4act.total_qty,
            ai.name,
            ai.content,
            ai.city,
            ai.area,
            ai.activity_pic;
`;
        const [activityRows] = await db.query(getActivityDataSql);
        console.log(activityRows);
        let activityImgs = ['31.jpg'];
        const sendRows = activityRows.map(v=>{
            const dayInfo = `${res.toDateDayString(v.eventStart)}~${res.toDateDayString(v.eventEnd)}`
            activityImgs.push(v.activity_pic.split(',')[1])
            return {...v, dayInfo: dayInfo,rules: (v.rules).split(',')}
        })
        output.activity = sendRows;
        output.activityImgs = activityImgs;
    }catch(error){
        console.error(error);
        throw new Error('取活動資料時出錯');
    }
    try{
        const getrestaurantDataSql =  `SELECT
  r.rest_sid,
  r.name,
  r.city,
  r.area,
  r.average_friendly,
  r.booking_count,
  r.info,
  GROUP_CONCAT(DISTINCT ru.rule_name) AS rule_names,
  GROUP_CONCAT(DISTINCT s.service_name) AS service_names,
  GROUP_CONCAT(DISTINCT ri.img_name) AS img_names
    FROM
        restaurant_information AS r
    JOIN restaurant_associated_rule AS ar ON r.rest_sid = ar.rest_sid
    JOIN restaurant_rule AS ru ON ar.rule_sid = ru.rule_sid
    JOIN restaurant_associated_service AS asr ON r.rest_sid = asr.rest_sid
    JOIN restaurant_service AS s ON asr.service_sid = s.service_sid
    JOIN restaurant_img AS ri ON r.rest_sid = ri.rest_sid
    LEFT JOIN restaurant_rating AS rr ON r.rest_sid = rr.rest_sid
    JOIN restaurant_associated_category AS ac ON r.rest_sid = ac.rest_sid
  WHERE 1
  GROUP BY
    r.rest_sid,
    r.name,
    r.city,
    r.area,
    r.average_friendly,
    r.booking_count,
    r.info
  ORDER BY
    booking_count DESC
    LIMIT 2;`;
        const [restaurantRows] = await db.query(getrestaurantDataSql);
        const useRows = restaurantRows.map(v=>{
            const hts = (v.service_names.split(',')).concat((v.rule_names.split(',')))
        return{...v,img_names: (v.img_names).split(',')[0], hashTags: hts }})
        output.restaurant = useRows;
    }catch(error){
        console.error(error);
        throw new Error('取餐廳資料時出錯');
    }
    try{
        const getPostDataSql = "SELECT ac.*, pm.post_title, post_content,pb.board_name FROM (SELECT ab.*, (SELECT `file` FROM post_file pf WHERE pf.post_sid = ab.post_sid Limit 1 ) AS img FROM (SELECT board_sid, SUBSTRING_INDEX( GROUP_CONCAT( post_sid ORDER BY like_count DESC ), ',', 1 ) AS post_sid, MAX(like_count) AS max_like_count FROM (SELECT plm.board_sid, plm.post_sid, (SELECT COUNT(*) FROM post_like pl WHERE pl.post_sid = plm.post_sid ) AS like_count FROM post_list_member plm GROUP BY plm.board_sid, plm.post_sid) aa GROUP BY board_sid ) ab) ac JOIN post_list_member pm ON ac.post_sid = pm.post_sid JOIN post_board pb ON pm.board_sid = pb.board_sid";
        const [postRows] = await db.query(getPostDataSql);
        const useRows = postRows.slice(0,11);
        output.forum = postRows;
    }catch(error){
        console.error(error);
        throw new Error('取貼文資料時出錯');
    }
    res.json(output);
})
router.get('/get-repay-order/:orderSid', async(req,res)=>{
     let output ={
        checkoutType : '',
        postType:0,
        details: [],
        orderInfo:[],
        coupon:[],
    }
    const orderSid  = req.params.orderSid;
    //拿取訂單商品/活動項目
    const orderDetailResult = await getOrderDetail(orderSid);
    console.log({orderDetailResult});
    output.checkoutType = orderDetailResult.checkoutType;
    output.details = orderDetailResult.details;
    //拿取訂單細節
    try{
        const getOrderSql = `SELECT om.*, mi.email FROM order_main om JOIN member_info mi ON mi.member_sid = om.member_sid WHERE om.order_sid = ?;`;
        const [getOrderResult] = await db.query(getOrderSql, [orderSid]);
        output.orderInfo = getOrderResult;
        console.log(getOrderResult);
        output.postType = getOrderResult[0].post_type;
        const csSid = getOrderResult[0].coupon_send_sid;
        //拿coupon資料
        let couponInfo = [];
        if(!!csSid){
            couponInfo = await getCouponData(csSid,res);
            output.coupon = couponInfo;
        } 
        console.log('couponInfo', couponInfo);
    }catch(error){
        console.error(error);
        throw new Error('取商品資料時出錯');
    }
    res.json(output);
})
router.post('/remove-cart-item', async (req,res)=>{
    const cartItems = [{cart_sid:req.body.cart_sid, order_status:'003'}]
    const removeResult = await updateCart(cartItems);
    console.log(removeResult);
    res.json(removeResult);
})
router.post('/add-newAddress', async(req,res)=>{
    const output = {success:false}
    const member_sid = req.body.member_sid;
    const {recipient,recipient_phone,post_type,store_name, default_status, city, area, address} = req.body.data;
    if(default_status===1){
        try{
            const updateDefaultSql = `UPDATE member_address SET default_status=0 WHERE member_sid = ?`;
            const [result]= await db.query(updateDefaultSql, member_sid);
        }catch(error){
            console.error(error);
            throw new Error('更新default值時出錯');
        }
    } 
    try{
        const addAddressSql = `INSERT INTO
            member_address(
                member_sid,
                recipient,
                recipient_phone,
                post_type,
                store_name,
                default_status,
                city,
                area,
                \`address\`
            )
            VALUES
                (
                    ?,?,?,?,?,?,?,?,?
                )`;
                console.log(addAddressSql);
        const [addAddressResult] = await db.query(addAddressSql,[member_sid,
                recipient,
                recipient_phone,
                post_type,
                store_name,
                default_status,
                city,
                area,
                address])
        addAddressResult.affectedRows && (output.success = true) &&(output.newId = addAddressResult.insertId);
        res.json(output);
    }catch(error){
        console.error(error);
        throw new Error('新增地址時出錯');
    }
})
router.delete('/delete-address', async(req,res)=>{
    const output = {success:false}
    const address_sid = req.body.address_sid;
    try{
        const deleteAddressSql = `DELETE FROM member_address WHERE address_sid = ?`;
        const [result]= await db.query(deleteAddressSql, address_sid);
        result.affectedRows && (output.success=true)
    }catch(error){
        console.error(error);
        throw new Error('更新default值時出錯');
    }
    res.json(output);
})
router.post('/create-order', async (req,res)=>{
    const output = {
        success: false,
        orderSid:"",
        finalTotal:0,
        checkoutType : "",
        paymentType:'',
        memberSid:""
    }

    output.checkoutType= req.body.checkoutType;
    output.paymentType = req.body.paymentType;
    output.memberSid = req.body.member_sid;
    //TODO:處理預設地址. 若是新增地址的話, 要記得補歷史地址

    const createOrderResult = await createOrder(req.body);
    output.orderSid = createOrderResult.orderSid;
    output.finalTotal = createOrderResult.finalTotal;
    output.success = createOrderResult.createOrderSuccess;
    res.json(output);
})
router.post('/get-orderDetail', async(req,res)=>{
    const output = {
        order_sid:"",
        email:"",
        checkoutType:"",
        create_dt:'',
        orderDetailItems:'',
        coupon_amount:0
    };
    const order_sid = req.body.order_sid;
    const checkoutType = req.body.checkoutType;
    console.log(order_sid);
    console.log(checkoutType);

    let getOrderDetailSql = '';
    if(checkoutType ==='shop'){
        getOrderDetailSql =(`SELECT
                om.order_sid,
                om.member_sid,
                om.recipient,
                om.recipient_phone,
                om.post_type,
                om.post_address,
                om.post_store_name,
                om.create_dt,
                od.order_detail_sid,
                od.rel_name,
                od.rel_seq_name,
                od.product_price,
                od.product_qty,
                om.rel_subtotal,
                om.coupon_amount,
                om.post_amount,
                sp.img,
                mi.email
            FROM
                order_main om
                JOIN order_details od ON om.order_sid = od.order_sid
                JOIN shop_product sp ON od.rel_sid = sp.product_sid
                JOIN member_info mi ON om.member_sid = mi.member_sid
            WHERE
                om.order_sid = ?`);   
    }else if(checkoutType === 'activity'){
        getOrderDetailSql = `SELECT
                om.order_sid,
                om.member_sid,
                om.create_dt,
                od.order_detail_sid,
                od.rel_name,
                od.rel_seq_name,
                od.adult_price,
                od.adult_qty,
                od.child_price,
                od.child_qty,
                om.rel_subtotal,
                om.coupon_amount,
                ai.activity_pic,
                mi.email
            FROM
                order_main om
                JOIN order_details od ON om.order_sid = od.order_sid
                JOIN activity_info ai ON od.rel_sid = ai.activity_sid
                JOIN member_info mi ON om.member_sid = mi.member_sid
            WHERE
                om.order_sid = ?;`;
    }
    try {
        const [orderDetailResult] = await db.query(getOrderDetailSql, [order_sid]);
        output.member_sid=orderDetailResult[0].member_sid;
        output.email=orderDetailResult[0].email;
        output.create_dt=res.toDatetimeString(orderDetailResult[0].create_dt);
        output.coupon_amount=orderDetailResult[0].coupon_amount;
        output.subtotal_amount=orderDetailResult[0].rel_subtotal;

        if(checkoutType === 'shop'){
            const pt = "";
                if(orderDetailResult[0].post_type===0){
                    pt='黑貓宅急便'
                } else if (orderDetailResult[0] ===1){
                    pt='7-Eleven'
                }else if(orderDetailResult[0] === 2){
                    pt='全家便利商店'
                }
            output.post_type=pt;
            output.recipient=orderDetailResult[0].recipient;
            output.recipient_phone=orderDetailResult[0].recipient_phone;
            output.post_address=orderDetailResult[0].post_address;
            output.post_store_name=orderDetailResult[0].post_store_name;
            output.post_amount=orderDetailResult[0].post_amount;
            output.orderDetailItems=orderDetailResult.map(v=>({...v, item_subTotal: (v.prod_price* v.prod_qty)}));
        }else if (checkoutType === 'activity'){
            output.orderDetailItems=orderDetailResult.map(v=>{
                const st = (v.adult_price* v.adult_qty_qty+v.child_price*v.child_qty);
                const img = v.activity_pic.split(',')[0];
                return {...v, item_subTotal: st, activity_pic: img}
            });
        }
        
    } catch(error) { console.error(error);
        throw new Error('讀取訂單明細失敗');
    }
    output.order_sid = order_sid;
    output.checkoutType = checkoutType;
    res.json(output);
})
router.post('/count-item', async(req,res)=>{
    try { 
        const member_sid = req.body.member_sid;
        const getCartItemNumSql = `SELECT 
            COUNT(oc.rel_sid) AS totalItem,
            GROUP_CONCAT(CONCAT(oc.rel_sid, '_', oc.rel_seq_sid)) AS rel_sids
        FROM 
            order_cart oc
        WHERE 
            oc.member_sid = ? AND oc.order_status = '001';` 
        const [itemAmount]= await db.query(getCartItemNumSql,member_sid);
        res.json(itemAmount[0]);
    } catch(error) { 
        console.log(error);
        throw new Error('取購物車數量時出錯');
    }
})
router.post('/get-mem-img', async(req,res)=>{
    try{
        const member_sid = req.body.member_sid;
        console.log('membersid',req.body.member_sid)
        const getMemImgSql = `SELECT mi.profile FROM member_info mi WHERE member_sid = ?`;
        const [profileImg] = await db.query(getMemImgSql, member_sid);
        let result = profileImg[0];
        if(result.profile === null ){
            result.profile = 0;
        }
        res.json(result);

    }catch(error){
        console.log(error);
        throw new Error('取會員照片時出錯')
    }
})
router.post('/test',(req, res) => {
    console.log(req.body);
    res.send(req.body);
} )
router.get('/ecpay', (req, res) => {
    const orderSid = req.query.orderSid;
    const totalAmount = req.query.totalAmount;
    const checkoutType = req.query.checkoutType;
    const memberSid = req.query.memberSid;
    const mtn = uuid().split('-').join("");
    let base_param = {
        MerchantTradeNo: mtn.slice(1,19), //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
        MerchantTradeDate: res.toDatetimeString2(new Date()), //ex: 2017/02/13 15:45:30
        TotalAmount: totalAmount,
        TradeDesc: '狗咪結帳',
        ItemName: orderSid,
        ReturnURL: 'http://127.0.0.1:3002/cart-api/ecpaycallback',
        OrderResultURL: 'http://localhost:3002/cart-api/ecpayresult',
        CustomField1: orderSid,
        CustomField2: checkoutType,
        CustomField3: memberSid,
    };
    let inv_params = {
    };
    const data = ecpayPayment.payment_client.aio_check_out_credit_onetime(
        parameters = base_param, invoice = inv_params);
    console.log('result : ' + data);
    res.type('text/html');
    res.status(200);
    res.send(data);
});
router.post('/ecpayresult', (req, res) => {
    try {
        console.log('payresult:' + JSON.stringify(req.body));
        const {RtnMsg}= req.body;
        if(RtnMsg === 'Succeeded'){
            //TODO: 前往結帳成功頁面
            paymentSucceeded(req.body,res);
        } else if(RtnMsg==="ERROR"){
            //TODO: 前往重新結帳頁面
            paymentFailed(req.body,res);
        }
    } catch (error) {
        console.warn('error', error);
        throw new Error('付款結果出錯');
    }
    res.status(200);
})
router.post('/ecpaycallback', (req, res) => {
    console.log('paycallback:' + JSON.stringify(req));
})
router.get('/linepay', async(req,res)=>{
    const orderSid = req.query.orderSid;
    const totalAmount = req.query.totalAmount;
    const checkoutType = req.query.checkoutType;
    const memberSid = req.query.memberSid;
    try {
        const response = await linePayClient.request.send({
        body: {
            amount:totalAmount,
            currency: 'TWD',
            orderId: `${orderSid}${checkoutType}${memberSid}`,
            packages: [
            {
                id: 'c99abc79-3b29-4f40-8851-bc618ca57856',
                amount: totalAmount,
                products: [
                {
                    name: '狗with咪商城/活動',
                    quantity: 1,
                    price: totalAmount
                },

                ]
            }
            ],
        redirectUrls: {
        confirmUrl: 'http://localhost:3002/cart-api/linepayResult',
        cancelUrl: 'http://localhost:3002/cart-api/linepayResult'
            }
      }
    })
    console.log('response:', response);

    res.redirect(response.body.info.paymentUrl.web)
  } catch (e) {
    console.log('error', e)
  }
})
router.get('/linepayResult', async(req,res)=>{
    console.log("req.query:",req.query.orderId);
    const response = {RtnMsg:'Succeeded'}; 
    const data={};
    try{
    const str=req.query.orderId;
    data.CustomField1 = str.slice(0,8);
    data.CustomField2 = str.includes('shop')?str.slice(8,12):str.slice(8,16)
    data.CustomField3 = str.slice(-8);
    }catch(error){
        console.warn('error', error);
        throw new Error('Line解晰回傳結果出錯');
    }
    console.log('data', data);
    try {
        console.log('payresult:' + JSON.stringify(req.body));
        const {RtnMsg}= response;
        if(RtnMsg === 'Succeeded'){
            //TODO: 前往結帳成功頁面
            console.log('data in payResult', data);
            paymentSucceeded(data,res);
        } else {
            //TODO: 前往重新結帳頁面
             console.log('data in repay', data);
            paymentFailed(data,res);
        }
    } catch (error) {
        console.warn('error', error);
        throw new Error('付款結果出錯');
    }
    res.status(200);
})
router.get ('/test1', async(req,res)=>{

    const sql = "SELECT ac.*, pm.post_title, post_content,pb.board_name FROM (SELECT ab.*, (SELECT `file` FROM post_file pf WHERE pf.post_sid = ab.post_sid Limit 1 ) AS img FROM (SELECT board_sid, SUBSTRING_INDEX( GROUP_CONCAT( post_sid ORDER BY like_count DESC ), ',', 1 ) AS post_sid, MAX(like_count) AS max_like_count FROM (SELECT plm.board_sid, plm.post_sid, (SELECT COUNT(*) FROM post_like pl WHERE pl.post_sid = plm.post_sid ) AS like_count FROM post_list_member plm GROUP BY plm.board_sid, plm.post_sid) aa GROUP BY board_sid ) ab) ac JOIN post_list_member pm ON ac.post_sid = pm.post_sid JOIN post_board pb ON pm.board_sid = pb.board_sid"; 

    const [data] = await db.query(sql);
    console.log(data);
    res.json(data)
})

module.exports = router;