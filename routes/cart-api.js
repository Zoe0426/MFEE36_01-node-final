const express = require('express');
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




const getNewOrderSid = async () => {
    try {
        const sqlHead = "SELECT MAX(order_sid) as maxSid FROM `order_main`";
        const [maxSid] = await db.query(sqlHead);
        if (maxSid[0].maxSid === undefined) { 
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

const updateCart = async(cartItems)=>{
    //cartItems: [{cart_sid:xxx, order_status:xxx}]
    //status: 001=>cart, 002=>order, 003=>delete
    //console.log('updateCart的items:', cartItems)
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
        throw new Error('更新優惠券狀態時出錯');
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
    //coupon
    const coupon_send_sid = (couponInfo.length)? couponInfo[0].coupon_send_sid: '';
    const couponPrice = (couponInfo.length)? couponInfo[0].price: 0;
    //send to 
    const sendto = (postInfo.length)?postInfo.filter(v=>v.selected)[0]:postInfo;
    const recipient= (postInfo.length)?sendto.recipient:null;
    const recipient_phone= (postInfo.length)?sendto.recipient_phone:null;
    const post_type= (postInfo.length)?sendto.post_type:null;
    const store_name= (postInfo.length)?sendto.store_name:null;
    const post_amount = (postInfo.length)?(sendto.post_type?90:60): 0; 
    const post_address = (postInfo.length)? (sendto.city+sendto.area+sendto.address): null;

    const subtotal = checkoutItems.reduce((a, v) => {
      const sub = v.prod_price * v.prod_qty;
      return a + sub;
    }, 0);
    const orderItems = checkoutType === 'shop'? checkoutItems.map(v=>({...v, 'rel_subtotal':v.prod_price*v.prod_qty})): checkoutItems.map(v=>({...v, 'rel_subtotal':v.adult_price*v.adult_qty+v.child_price+v.child_qty}));

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
            store_name, post_address , 1, 
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
const paymentSucceeded=async(data)=>{
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
const paymentFailed = async()=>{
    //res.redirect(`http://localhost:3000/cart/order-complete?orderSid=${CustomField1}&checkoutType=${CustomField2}&memberSid=${CustomField3}`);
}
router.post ('/get-cart-items', async(req,res)=>{
    let output ={
        shop : [],
        activity : [],
        postAddress:[],
        coupon:[],
    }
    const memberSid = req.body.member_sid;
    const today = res.toDateString(new Date())
    //getCartItems
    const getCartItemSql = `SELECT
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
            sp.img as img
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
            ai.activity_pic as img
        FROM
            order_cart oc
            JOIN activity_info ai ON oc.rel_sid = ai.activity_sid
            JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
            AND oc.rel_seq_sid = ag.activity_group_sid
        WHERE
            oc.member_sid = ? 
            AND oc.order_status = '001'`;
    const [cartData] = await db.query(getCartItemSql,[memberSid,memberSid]);

    output.shop = cartData.filter(p=>p.rel_type === "product");
    const actData = cartData.filter(p=>p.rel_type === "activity")
    output.activity = actData.map(p=>({...p, img : (p.img.split(',')[0])}))

    //getHistoryPostDetails
    const getAddressSql = `SELECT
            ma.*,
            mi.email
        FROM
            member_address ma
            JOIN member_info mi ON ma.member_sid = mi.member_sid
        WHERE
            ma.member_sid = ? 
        ORDER BY ma.default_status DESC`;
    const [postData] = await db.query(getAddressSql,[memberSid]);
    //console.log(postData);
    output.postAddress =  postData;

    //getUsableCoupon
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
router.get('/test',(req, res) => {
    console.log('req.query.orderSid:',req.query.orderSid)

    res.json(req.query.totalAmount );
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
            paymentSucceeded(req.body);
        } else {
            //TODO: 前往重新結帳頁面
            paymentFailed(req.body);
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
module.exports = router;