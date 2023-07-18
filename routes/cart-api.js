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

const createOrder = async(data)=>{
    const result = {
        addtoOrdermain: false,
        addtoOrderdetail:false,
        orderSid:"",
        finalTotal:0
    };
    const newOrderSid = await getNewOrderSid();
    result.orderSid = newOrderSid;
    const {checkoutType, paymentType, checkoutItems, couponInfo,postInfo, member_sid} = data;
    const {coupon_send_sid, price}=couponInfo[0];
    const sendto = postInfo.filter(v=>v.selected)[0];
    const {recipient,recipient_phone,post_type, store_name}= sendto;
    const post_amount = sendto.post_type === 1?90:60; 
    const post_address = sendto.city+sendto.area+sendto.address;
    const subtotal = checkoutItems.reduce((a, v) => {
      const sub = v.prod_price * v.prod_qty;
      return a + sub;
    }, 0);
    const orderItems = checkoutType === 'shop'? checkoutItems.map(v=>({...v, 'rel_subtotal':v.prod_price*v.prod_qty})): checkoutItems.map(v=>({...v, 'rel_subtotal':v.adult_price*v.adult_qty+v.child_price+v.child_qty}));
    result.finalTotal= subtotal + post_amount - price;
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
            price, 0])
        orderMainresult.affectedRows && (result.addtoOrdermain = true);
    }catch(error){
        console.error(error);
        throw new Error('加父表格時時出錯');
    }
    try{

        for(let item of orderItems){
            const {rel_sid, rel_seq_sid,rel_name,rel_seq_name,prod_price,prod_qty,adult_price,adult_qty,child_price, child_qty,rel_subtotal}=item;
            console.log(rel_sid, rel_seq_sid,rel_name,rel_seq_name,prod_price,prod_qty,adult_price,adult_qty,child_price, child_qty,rel_subtotal);
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
        throw new Error('加子表格時時出錯');
    }
    
    return result;
}
router.post('/create-order', async (req,res)=>{
    const output = {
        success: false,
        orderSid:"",
        finalTotal:0,
        createOrderMainSuccess : false,
        createOrderDetailSuccess : false,
        paymentSuccess : false,
        checkoutType : "",
        paymentType:'',

    }

    output.checkoutType= req.body.checkoutType;
    output.paymentType = req.body.paymentType;

    //TODO:處理預設地址. 若是新增地址的話, 要記得補歷史地址
    //TODO:更新優惠卷狀態

    //新增訂單(加到order_main && order_detail)
    //TODO: 把body 裡的資料去資料庫拿正式的價錢再create order
    const createOrderResult = await createOrder(req.body);
    createOrderResult.addtoOrdermain &&  createOrderResult.addtoOrderdetail && (output.success = true);
    output.orderSid = createOrderResult.orderSid;
    output.finalTotal = createOrderResult.finalTotal;
    res.json(output);
})

router.get('/test',(req, res) => {
    console.log('req.query.orderSid:',req.query.orderSid)

    res.json(req.query.totalAmount );
} )

router.get('/ecpay', (req, res) => {
    console.log('req.query.orderSid:', req.query.orderSid);
    console.log('req.query.totalAmount:', req.query.totalAmount);
    const orderSid = req.query.orderSid;
    const totalAmount = req.query.totalAmount;
    const mtn = uuid().split('-').join("");
    console.log('mtn:', mtn);
    let base_param = {
        MerchantTradeNo: mtn.slice(1,19), //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
        MerchantTradeDate: res.toDatetimeString2(new Date()), //ex: 2017/02/13 15:45:30
        TotalAmount: totalAmount,
        TradeDesc: '狗咪結帳',
        ItemName: orderSid,
        ReturnURL: 'http://127.0.0.1:3002/cart-api/ecpaycallback',
        OrderResultURL: 'http://localhost:3002/cart-api/ecpayresult',
        CustomField1: orderSid
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
        if(req.body.RtnMsg === 'Succeeded'){
            // i have orderNo , change order status
            // redirect to paysucceed use req.body.MerchantTradeNo
            // http://127.0.0.1/paysucceed?orderNo={req.body.MerchantTradeNo}
        } else {
            // pay error/。
            // http://127.0.0.1/payerror?orderNo={req.body.MerchantTradeNo}
        }

    } catch (e) {
        console.warn('error', e);
    }
    res.status(200);
    const {CustomField1,RtnMsg}= req.body;
    if(RtnMsg==='Succeeded'){
        //TODO: 前往結帳成功頁面
        //res.redirect('http://localhost:3000/cart/order-complete');
    }
    if(RtnMsg==="ERROR"){
        //TODO: 前往重新結帳頁面
    }
    res.send(req.body.CustomField1);
    //console.log(req.body);
    
})

router.post('/ecpaycallback', (req, res) => {
    console.log('paycallback:' + JSON.stringify(req));
})
module.exports = router;