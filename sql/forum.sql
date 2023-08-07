SELECT plm.*,
pc.*,
pb.* 
FROM post_list_member plm 
JOIN post_comment pc
ON plm.post_sid = pc.post_sid
JOIN post_board pb
ON plm.board_sid = pb.board_sid 
WHERE pb.board_sid = '${boardid}';
--
UPDATE `post_file` SET `file` = 'Post002.jpeg' WHERE `post_file`.`file_sid` = 2;
UPDATE `post_file` SET `file` = 'Post003.jpeg' WHERE `post_file`.`file_sid` = 3;