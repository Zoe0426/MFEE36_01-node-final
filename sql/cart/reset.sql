UPDATE
    member_coupon_send
SET
    coupon_status = 0,
    used_time = null
WHERE
    member_sid = 'mem00300';

UPDATE
    order_cart
SET
    order_status = '001'
WHERE
    member_sid = 'mem00300';