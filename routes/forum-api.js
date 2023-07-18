const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

// 論壇首頁
router.get ('/', async(req,res)=>{
    // 論壇文章列表
    // 熱門文章(按讚數)
    const [data] = await db.query(
        `
        SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, 
        CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content END AS post_content, pb.board_name, 
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
        JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid 
        ORDER BY postLike DESC;
      `
    );
    // 最新文章（按日期）
    // const [lateD] = await db.query(
    //     `
    //     SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date, 
    //     CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
    //     ELSE plm.post_content END AS post_content, pb.board_name, 
    //     (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
    //     (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
    //     (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
    //     (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
    //     JOIN member_info mi ON mi.member_sid = plm.member_sid 
    //     JOIN post_board pb ON plm.board_sid = pb.board_sid 
    //     ORDER BY post_date DESC;
    //     `
    // )

    res.json(data);
    
});

// 論壇首頁try try 看
router.get ('/index_try', async(req,res)=>{
    // 論壇文章列表
    // 熱門文章(按讚數)
    const [data] = await db.query(
        `
        SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, 
        CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content END AS post_content, pb.board_name, 
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
        JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid 
        ORDER BY postLike DESC;
      `
    );
    // 最新文章（按日期）
    const [lateD] = await db.query(
        `
        SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date, 
        CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content END AS post_content, pb.board_name, 
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
        JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid 
        ORDER BY post_date DESC;
        `
    )

    res.json({data, lateD});
    
});
// 首頁下面：你可能會喜歡
router.get ('/recommend', async(req,res)=>{
    const [data] = await db.query(
        `SELECT
        mi.member_sid,
        mi.nickname,
        plm.post_sid,
        plm.board_sid,
        plm.post_title,
        CASE WHEN CHAR_LENGTH(plm.post_content) > 10 THEN CONCAT(SUBSTRING(plm.post_content, 1, 10), '...') ELSE plm.post_content END AS post_content,
        pb.board_name,
        pb.board_img,
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file,
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike,
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment,
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist
    FROM
        post_list_member plm
        JOIN member_info mi ON mi.member_sid = plm.member_sid
        JOIN post_board pb ON plm.board_sid = pb.board_sid
    ORDER BY
        postFavlist DESC;
    
    `
    );
    res.json(data)
    
})
// // `post_list_member` join `post_comment`及 `post_board`
// router.get ('/:postid', async(req,res)=>{
//     const [data] = await db.query("SELECT `post_list_member`.*,`post_comment`.*,`post_board`.* FROM `post_list_member` JOIN `post_comment` ON `post_list_member`.`post_sid`=`post_comment`.`post_sid`JOIN `post_board`ON `post_list_member`.`board_sid`=`post_board`.`board_sid`");
//     res.json(data)
    
// })

// 文章點進去的頁面
router.get ('/:postid', async(req,res)=>{
    //console.log('req.params:', req.params.postid);
    let {postid} = req.params;
    const [data] = await db.query(`
    SELECT 
    plm.post_title, 
    plm.post_content, 
    mi.nickname, 
    mi.member_ID, 
    pb.board_name, 
    pb.board_img, 
    plm.post_date, 
    plm.update_date, 
    ph.hashtag_name, 
    pf.file, 
    pc.comment_content, 
    pc.comment_date,
    (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
    (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment
FROM 
    post_list_member plm 
JOIN 
    member_info mi ON mi.member_sid = plm.member_sid
JOIN 
    post_board pb ON plm.board_sid = pb.board_sid
JOIN 
    post_comment pc ON plm.post_sid = pc.post_sid
JOIN 
    post_hashtag ph ON plm.post_sid = ph.post_sid
JOIN 
    post_like pl ON plm.post_sid = pl.post_sid
JOIN 
    post_file pf ON pf.post_sid = plm.post_sid
WHERE plm.post_sid='${postid}'`)
    // const [data] = await db.query(`SELECT post_list_member.*,post_comment.*,post_board.* FROM post_list_member JOIN post_comment ON post_list_member.post_sid=post_comment.post_sid JOIN post_board ON post_list_member.board_sid = post_board.board_sid WHERE post_list_member.post_sid='${postid}'`);
    console.log('data', data);
    res.json(data)
    //res.send('124');
})

// 看板
router.get ('/board/:boardid', async(req,res)=>{
    let {boardid} = req.params;
    const [boardData] = await db.query(
        `SELECT plm.*, pc.*, pb.* 
            FROM post_list_member plm 
            JOIN post_comment pc
            ON plm.post_sid = pc.post_sid
            JOIN post_board pb
            ON plm.board_sid = pb.board_sid 
            WHERE pb.board_sid = '${boardid}'`
        );
    res.json(boardData)
})

module.exports = router;