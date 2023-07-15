const express = require('express');
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect")
const upload = require(__dirname+"/../modules/img-upload.js");
const multipartParser = upload.none(); 

// 論壇首頁
router.get ('/', async(req,res)=>{
    const [data] = await db.query(
        `SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid,  plm.post_title, plm.post_content, pb.board_name, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) as postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid)as postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid )as postFavlist 
        FROM post_list_member plm JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid 
        ORDER BY postLike DESC;`
    );
    res.json(data)
    
})

router.get ('/recommend', async(req,res)=>{
    const [data] = await db.query(
        `SELECT
        mi.member_sid,
        mi.nickname,
        plm.post_sid,
        plm.board_sid,
        plm.post_title,
        plm.post_content,
        pb.board_name,
        pb.board_img,
        COUNT(DISTINCT pl.post_sid) AS postLike,
        COUNT(DISTINCT pc.post_sid) AS postComment,
        COUNT(DISTINCT pf.post_sid) AS postFavlist
    FROM
        post_list_member plm
        JOIN member_info mi ON mi.member_sid = plm.member_sid
        JOIN post_board pb ON plm.board_sid = pb.board_sid
        LEFT JOIN post_like pl ON pl.post_sid = plm.post_sid
        LEFT JOIN post_comment pc ON pc.post_sid = plm.post_sid
        LEFT JOIN post_favlist pf ON pf.post_sid = plm.post_sid
    GROUP BY
        plm.post_sid
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
    const [data] = await db.query(`SELECT post_list_member.*,post_comment.*,post_board.* FROM post_list_member JOIN post_comment ON post_list_member.post_sid=post_comment.post_sid JOIN post_board ON post_list_member.board_sid = post_board.board_sid WHERE post_list_member.post_sid='${postid}'`);
    console.log('data', data);
    res.json(data)
    //res.send('124');
})

// 看板 問題：為什麼跑出的資料沒有只有board_sid=1(有在資料庫跑過的)
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