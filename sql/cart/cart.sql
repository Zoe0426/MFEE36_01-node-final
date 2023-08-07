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

--取各商品類別最熱銷
SELECT
    p.product_sid,
    p.name,
    p.img,
    p.sales_qty,
    (
        SELECT
            MIN(price)
        FROM
            shop_product_detail
        WHERE
            product_sid = p.product_sid
    ) AS min_price,
    (
        SELECT
            MAX(price)
        FROM
            shop_product_detail
        WHERE
            product_sid = p.product_sid
    ) AS max_price,
    c.detail_name
FROM
    shop_category AS c
    JOIN (
        SELECT
            *
        FROM
            shop_product
        WHERE
            (category_detail_sid, sales_qty) IN (
                SELECT
                    category_detail_sid,
                    MAX(sales_qty)
                FROM
                    shop_product
                GROUP BY
                    category_detail_sid
            )
    ) AS p ON c.category_detail_sid = p.category_detail_sid
ORDER BY
    p.sales_qty DESC;

------------------------------
熱門活動 （ order - detail熱門活動 ）
SELECT
    top4act.rel_sid,
    top4act.total_qty,
    ai.name,
    ai.content,
    ai.city,
    ai.area,
    ai.activity_pic,
    MAX(ag.date) as eventEnd,
    MIN(ag.date) as eventStart
FROM
    (
        SELECT
            rel_sid,
            SUM(adult_qty) + SUM(child_qty) AS total_qty
        FROM
            order_details
        WHERE
            rel_type = 'activity'
        GROUP BY
            rel_sid
        ORDER BY
            total_qty DESC
        LIMIT
            4
    ) top4act
    JOIN activity_info ai ON top4act.rel_sid = ai.activity_sid
    JOIN activity_group ag ON ai.activity_sid = ag.activity_sid
GROUP BY
    top4act.rel_sid,
    top4act.total_qty,
    ai.name,
    ai.content,
    ai.city,
    ai.area,
    ai.activity_pic;

SELECT
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
        SELECT
            rel_sid,
            SUM(adult_qty) + SUM(child_qty) AS total_qty
        FROM
            order_details
        WHERE
            rel_type = 'activity'
        GROUP BY
            rel_sid
        ORDER BY
            total_qty DESC
        LIMIT
            4
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

-------------------
--取得各看板最熱門文章
SELECT
    ac.*,
    pm.post_title,
    post_content,
    pb.board_name
FROM
    (
        SELECT
            ab.*,
            (
                SELECT
                    file
                FROM
                    post_file pf
                WHERE
                    pf.post_sid = ab.post_sid
                Limit
                    1
            ) AS img
        FROM
            (
                SELECT
                    board_sid,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            post_sid
                            ORDER BY
                                like_count DESC
                        ),
                        ',',
                        1
                    ) AS post_sid,
                    MAX(like_count) AS max_like_count
                FROM
                    (
                        SELECT
                            plm.board_sid,
                            plm.post_sid,
                            (
                                SELECT
                                    COUNT(*)
                                FROM
                                    post_like pl
                                WHERE
                                    pl.post_sid = plm.post_sid
                            ) AS like_count
                        FROM
                            post_list_member plm
                        GROUP BY
                            plm.board_sid,
                            plm.post_sid
                    ) aa
                GROUP BY
                    board_sid
            ) ab
    ) ac
    JOIN post_list_member pm ON ac.post_sid = pm.post_sid
    JOIN post_board pb ON pm.board_sid = pb.board_sid;

--購物車
SELECT
    COUNT(DISTINCT oc.rel_sid) AS totalItem,
    GROUP_CONCAT(DISTINCT oc.rel_sid) AS rel_sids
FROM
    order_cart oc
WHERE
    member_sid = 'mem00300'
    AND order_status = '001';

--加地址
INSERT INTO
    member_address(
        member_sid,
        recipient,
        recipient_phone,
        post_type,
        store_name,
        default_status,
        city,
        area,
        'address'
    )
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?);

--
SELECT
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
    od.order_sid = 'ORD07422'
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
    od.order_sid = 'ORD07422'