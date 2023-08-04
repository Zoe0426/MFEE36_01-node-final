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

------
----
-- act (9)
-- res(14)
-- shop(8)
-- forum(10)
-- mem(6)
-- cart(3)
DROP TABLE `pet_db`.`restaurant_activity`;

DROP TABLE `pet_db`.`restaurant_associated_category`;

DROP TABLE `pet_db`.`restaurant_associated_rule`;

DROP TABLE `pet_db`.`restaurant_associated_service`;

DROP TABLE `pet_db`.`restaurant_booking`;

DROP TABLE `pet_db`.`restaurant_category`;

DROP TABLE `pet_db`.`restaurant_img`;

DROP TABLE `pet_db`.`restaurant_information`;

DROP TABLE `pet_db`.`restaurant_like`;

DROP TABLE `pet_db`.`restaurant_menu`;

DROP TABLE `pet_db`.`restaurant_period_of_time`;

DROP TABLE `pet_db`.`restaurant_rating`;

DROP TABLE `pet_db`.`restaurant_rule`;

DROP TABLE `pet_db`.`restaurant_service`;

DROP TABLE `pet_db`.`shop_product_detail`;

DROP TABLE `pet_db`.`shop_product_specific`;

DROP TABLE `pet_db`.`shop_specific`;

DROP TABLE `pet_db`.`post_view`;

DROP TABLE `pet_db`.`post_share`;

DROP TABLE `pet_db`.`post_list_member`;

DROP TABLE `pet_db`.`post_like`;

DROP TABLE `pet_db`.`post_hashtag`;

DROP TABLE `pet_db`.`post_file`;

DROP TABLE `pet_db`.`post_favlist`;

DROP TABLE `pet_db`.`post_comment`;

DROP TABLE `pet_db`.`post_board`;

DROP TABLE `pet_db`.`member_coupon_send`;

DROP TABLE `pet_db`.`member_coupon_category`;

DROP TABLE `pet_db`.`member_info`;