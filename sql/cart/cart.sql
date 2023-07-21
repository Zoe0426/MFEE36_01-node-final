-- get shop and activity from  cart
SELECT
    sp.product_sid as rel_sid,
    sp.name as rel_name,
    spd.product_detail_sid as rel_seq_sid,
    spd.name as rel_seq_name,
    spd.price as prod_price,
    oc.product_qty as prod_qty,
    oc.rel_type as rel_type,
    0 as adult_price,
    0 as child_price,
    0 as adult_qty,
    0 as child_qty
FROM
    order_cart oc
    JOIN shop_product sp ON oc.rel_sid = sp.product_sid
    JOIN shop_product_detail spd ON sp.product_sid = spd.product_sid
    AND oc.rel_seq_sid = spd.product_detail_sid
WHERE
    oc.member_sid = 'mem00471'
    AND oc.order_status = '001'
UNION
ALL
SELECT
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
    oc.child_qty as child_qty
FROM
    order_cart oc
    JOIN activity_info ai ON oc.rel_sid = ai.activity_sid
    JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
    AND oc.rel_seq_sid = ag.activity_group_sid
WHERE
    oc.member_sid = 'mem00471'
    AND oc.order_status = '001';

----get member address
SELECT
    ma.member_sid,
    ma.category,
    ma.store_name,
    ma.default_status,
    ma.city,
    ma.area,
    ma.address,
    mi.name,
    mi.email,
    mi.mobile
FROM
    member_address ma
    JOIN member_info mi ON ma.member_sid = mi.member_sid
WHERE
    ma.member_sid = 'mem00471';

--get coupon
SELECT
    mcs.member_sid,
    mcs.coupon_sid,
    mcs.coupon_send_sid,
    mcc.name,
    mcc.price,
    mcc.exp_date,
    mcs.coupon_status
FROM
    member_coupon_send mcs
    JOIN member_coupon_category mcc ON mcs.coupon_sid = mcc.coupon_sid
WHERE
    mcs.member_sid = ?
    AND mcs.coupon_status = 0
ORDER BY
    mcc.exp_date ASC;

--create order-main
INSERT INTO
    order_main(
        order_sid,
        member_sid,
        coupon_sid,
        recipient,
        recipient_phone,
        post_type,
        post_store_name,
        post_address,
        post_status,
        tread_type,
        rel_subtotal,
        post_amount,
        coupon_amount,
        order_status,
        create_dt
    )
VALUES
    () --create order detail
INSERT INTO
    order_details(
        order_detail_sid,
        order_sid,
        rel_type,
        rel_sid,
        rel_seq_sid,
        rel_name,
        rel_seqName,
        product_amount,
        product_qty,
        adult_amount,
        adult_qty,
        child_amount,
        child_qty,
        rel_subtotal
    )
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

--update coupon
UPDATE
    member_coupon_send
SET
    coupon_status = ?,
    used_time = now()
WHERE
    coupon_send_sid = ?;

--update cart
UPDATE
    order_cart
SET
    order_status = ?
WHERE
    cart_sid = ?;

--update order
UPDATE
    order_main
SET
    order_status = ?
WHERE
    order_sid = ?;

--getOrderDetail/shop
SELECT
    om.order_sid,
    om.recipient,
    om.recipient_phone,
    om.post_type,
    om.post_address,
    om.post_store_name,
    om.create_dt,
    od.rel_name,
    od.rel_seq_name,
    od.product_price,
    od.product_qty,
    om.rel_subtotal,
    om.coupon_amount,
    om.post_amount,
    sp.img
FROM
    order_main om
    JOIN order_details od ON om.order_sid = od.order_sid
    JOIN shop_product sp ON od.rel_sid = sp.product_sid
WHERE
    om.order_sid = ?;

--get OrderDetail/activity
SELECT
    om.order_sid,
    om.create_dt,
    od.rel_name,
    od.rel_seq_name,
    od.adult_price,
    od.adult_qty,
    od.child_price,
    od.child_qty om.rel_subtotal,
    om.coupon_amount,
    om.post_amount,
    ai.activity_pic
FROM
    order_main om
    JOIN order_details od ON om.order_sid = od.order_sid
    JOIN activity_info ai ON od.rel_sid = ai.activity_sid
WHERE
    om.order_sid = ?;