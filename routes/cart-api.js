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

router.get ('/', async(req,res)=>{
    const [data] = await db.query("SELECT * FROM address_book LIMIT 2");
    res.json(data)
})
router.get('/test',(req, res) => {
    
    res.send();
} )

router.get('/ecpay', (req, res) => {
    const mtn = uuid().split('-').join("");
    console.log('mtn:', mtn);
    let base_param = {
        MerchantTradeNo: mtn.slice(1,19), //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
        MerchantTradeDate: res.toDatetimeString2(new Date()), //ex: 2017/02/13 15:45:30
        TotalAmount: '100',
        TradeDesc: '測試交易描述',
        ItemName: '測試商品等',
        ReturnURL: 'http://127.0.0.1:3002/cart-api/ecpaycallback',
        OrderResultURL: 'http://localhost:3002/cart-api/ecpayresult',
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
    res.send(req.body);
})

router.post('/ecpaycallback', (req, res) => {
    console.log('paycallback:' + JSON.stringify(req));
})
module.exports = router;