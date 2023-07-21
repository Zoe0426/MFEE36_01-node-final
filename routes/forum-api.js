const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

// 論壇首頁
router.get("/", async (req, res) => {
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

  res.json(data);
});

// 論壇首頁try try 看
router.get("/index_try", async (req, res) => {
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
  );

  res.json({ data, lateD });
});
// 首頁下面：你可能會喜歡
router.get("/recommend", async (req, res) => {
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
        postFavlist DESC
    LIMIT 1,10;
    
    `
  );
  res.json(data);
});

// 文章點進去的頁面(postid)
// 1. 上半部：作者、文章標題
router.get("/:postid", async (req, res) => {
  //console.log('req.params:', req.params.postid);
  let { postid } = req.params;
  const [data] = await db.query(`
    SELECT 
    plm.post_title, 
    plm.post_content, 
    mi.nickname, 
    mi.member_ID,
    mi.profile, 
    pb.board_name, 
    pb.board_img, 
    plm.post_date, 
    plm.update_date, 
    (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
    (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment
FROM 
    post_list_member plm 
JOIN 
    member_info mi ON mi.member_sid = plm.member_sid
JOIN 
    post_board pb ON plm.board_sid = pb.board_sid
WHERE plm.post_sid='${postid}'`);
  // console.log('data', data);
  const newData = data.map((v) => ({
    ...v,
    post_date: res.toDatetimeString(v.post_date),
    update_date: res.toDatetimeString(v.update_date),
  }));
  console.log("newData", newData);

  // 2. hashtag
  const [tagData] = await db.query(
    `
        SELECT ph.hashtag_name FROM post_hashtag ph 
        JOIN post_list_member plm ON plm.post_sid = ph.post_sid 
        WHERE plm.post_sid = '${postid}';
        `
  );
  console.log("tagData", tagData);

  // 3. 文章下面：留言
  const [commentData] = await db.query(
    `
        SELECT pc.comment_content, pc.comment_date, pc.member_sid, mi.nickname, mi.member_sid, mi.profile FROM post_comment pc 
        JOIN member_info mi ON mi.member_sid = pc.member_sid
        JOIN post_list_member plm ON plm.post_sid = pc.post_sid
        WHERE plm.post_sid = '${postid}';
        `
  );
  const newCommentData = commentData.map((v) => ({
    ...v,
    comment_date: res.toDatetimeString(v.comment_date),
  }));
  console.log("commentData", commentData);
  console.log("newCommentData", newCommentData);

  // 4. 圖片
  const [imgData] = await db.query(
    `
        SELECT pf.file, plm.post_sid FROM post_file pf 
        JOIN post_list_member plm ON pf.post_sid = plm.post_sid
        WHERE pf.post_sid = '${postid}';
        `
  );
  console.log("imgData", imgData);

  res.json({ newData, tagData, newCommentData, imgData });
});

// 看板
router.get("/board/:boardid", async (req, res) => {
  let { boardid } = req.params;
  const [boardData] = await db.query(
    `SELECT plm.*, pc.*, pb.* 
            FROM post_list_member plm 
            JOIN post_comment pc
            ON plm.post_sid = pc.post_sid
            JOIN post_board pb
            ON plm.board_sid = pb.board_sid 
            WHERE pb.board_sid = '${boardid}'`
  );
  res.json(boardData);
});

// 個人頁面：我的文章
router.get("/forum/blog", async (req, res) => {
  //let { memberid } = req.params;
  const output = {
    success:false,
    error:"",
    data:null,
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  if(!res.locals.jwtData){
    output.error="沒有驗證";
    return res.json(output);
  }

  console.log(res.locals.jwtData.id);

  const sid = res.locals.jwtData.id;
  const page = parseInt(req.query.page) || 1;
  const perPage = output.perPage;
  const offset = (page - 1) * perPage;

  const [totalRowsData] = await db.query(
    `SELECT COUNT(1) AS totalRows FROM post_list_member plm
    JOIN member_info mi ON mi.member_sid = plm.member_sid
    WHERE mi.member_sid = '${sid}';`
  );
  const totalRows = totalRowsData[0].totalRows;
  const totalPages = Math.ceil(totalRows / perPage);

  const [blogPostData] = await db.query(
    `SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date, 
        CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content END AS post_content, pb.board_name, 
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist 
        FROM post_list_member plm JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid 
        WHERE mi.member_sid = '${sid}' 
        ORDER BY post_date DESC
        LIMIT ${offset}, ${perPage};`
  );
  output.success = true;
  output.totalRows = totalRows;
  output.totalPages = totalPages;
  output.page = page;
  output.rows = blogPostData;
  res.json(output);
  //console.log("blogPostData", blogPostData);
});

module.exports = router;
