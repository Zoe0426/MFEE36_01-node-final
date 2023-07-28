const express = require("express");
const router = express.Router();
const db = require(__dirname + "/../modules/db_connect");
const upload = require(__dirname + "/../modules/img-upload.js");
const multipartParser = upload.none();

// // 論壇首頁
// router.get("/", async (req, res) => {
//   // 論壇文章列表
//   // 熱門文章(按讚數)
//   const output = {
//     success:false,
//     error:"",
//     data:null,
//     totalRows: 0,
//     perPage: 15,
//     totalPages: 0,
//     page: 1,
//     rows: [],
//   };

//   const page = parseInt(req.query.page) || 1;
//   const perPage = output.perPage;
//   const offset = (page - 1) * perPage;

//   const [totalRowsData] = await db.query(
//     `SELECT COUNT(1) AS totalRows FROM post_list_member WHERE 1;`
//     );
//     const totalRows = totalRowsData[0].totalRows;
//     const totalPages = Math.ceil(totalRows / perPage);

//   const [data] = await db.query(
//     `
//         SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, 
//         CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
//         ELSE plm.post_content END AS post_content, pb.board_name, 
//         (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
//         (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
//         (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
//         (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
//         JOIN member_info mi ON mi.member_sid = plm.member_sid 
//         JOIN post_board pb ON plm.board_sid = pb.board_sid 
//         ORDER BY postLike DESC
//         LIMIT ${offset}, ${perPage};
//       `
//   );
//   output.success = true;
//   output.totalRows = totalRows;
//   output.totalPages = totalPages;
//   output.page = page;
//   output.rows = data;
//   console.log("data",data);
//   res.json(output);

//   // res.json(data);
// });

// 論壇首頁
router.get("/", async (req, res) => {
  // 論壇文章列表
  // 熱門文章(按讚數)
  let output = {
    success:false,
    error:"",
    data:null,
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };
  console.log(req.query);
  let perPage = req.query.perPage || 15;
  let keyword = req.query.keyword || "";
  let orderBy = req.query.orderBy || "postLike";
  let board_sid = req.query.board_sid || 0;
  console.log('orderBy',orderBy);

  // const offset = (page - 1) * perPage;
  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    page = 1;
  }

  //queryString條件判斷
  let where = ` WHERE 1`;

  //關鍵字
  if (keyword) {
    let keyword_escaped = db.escape("%" + keyword + "%");
    where += ` AND (plm.post_content LIKE ${keyword_escaped}) OR (plm.post_title LIKE ${keyword_escaped})`;
  }
  //看板篩選
  if(board_sid != 0){
    where += ` AND plm.board_sid=${board_sid} `
  }

  //排序
  let order = " ";
  if(orderBy==="postLike"){
    order=" ORDER BY postLike DESC "
  }else{
    order=" ORDER BY plm.post_date DESC "
  }

  const [data] = await db.query(
    `
        SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date ,
        CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content END AS post_content, pb.board_name, 
        (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
        (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
        (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
        (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
        JOIN member_info mi ON mi.member_sid = plm.member_sid 
        JOIN post_board pb ON plm.board_sid = pb.board_sid
        ${where}
        ${order}
        LIMIT ${perPage * (page - 1)}, ${perPage}
      `
  );

  console.log(    `
  SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date ,
  CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
  ELSE plm.post_content END AS post_content, pb.board_name, 
  (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
  (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
  (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
  (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
  JOIN member_info mi ON mi.member_sid = plm.member_sid 
  JOIN post_board pb ON plm.board_sid = pb.board_sid
  ${where}
  ${order}
  LIMIT ${perPage * (page - 1)}, ${perPage}
`);
  const [totalRowsData] = await db.query(
    `SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date ,
    CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
    ELSE plm.post_content END AS post_content, pb.board_name, 
    (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
    (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
    (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
    (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
    JOIN member_info mi ON mi.member_sid = plm.member_sid 
    JOIN post_board pb ON plm.board_sid = pb.board_sid
    ${where}
    ${order}`
    );
    const totalRows = totalRowsData.length;
    console.log('totalRows',totalRows);
    const totalPages = Math.ceil(totalRows / perPage);
  output.success = true;
  output.totalRows = totalRows;
  output.totalPages = totalPages;
  output.perPage = perPage;
  output.page = page;
  output.rows = data;
  //console.log("data",data);
  res.json(output);

  // res.json(data);
});



// 看板做分頁
router.get("/board/:boardid", async (req, res) => {
  let { boardid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const perPage = 15;
  const offset = (page - 1) * perPage;

  const [boardData] = await db.query(
    `
    SELECT plm.*, pc.*, pb.* 
    FROM post_list_member plm 
    JOIN post_comment pc ON plm.post_sid = pc.post_sid
    JOIN post_board pb ON plm.board_sid = pb.board_sid 
    WHERE pb.board_sid = '${boardid}'
    ORDER BY plm.post_sid DESC
    LIMIT ${offset}, ${perPage};
  `
  );

  const [totalRowsData] = await db.query(
    `SELECT COUNT(1) AS totalRows FROM post_list_member WHERE board_sid = '${boardid}';`
  );
  const totalRows = totalRowsData[0].totalRows;
  const totalPages = Math.ceil(totalRows / perPage);

  res.json({
    success: true,
    totalRows,
    totalPages,
    page,
    rows: boardData,
  });
});










// 論壇首頁try try 看
// router.get("/index_try", async (req, res) => {
//   // 論壇文章列表
//   // 熱門文章(按讚數)
//   const [data] = await db.query(
//     `
//         SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, 
//         CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
//         ELSE plm.post_content END AS post_content, pb.board_name, 
//         (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
//         (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
//         (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
//         (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
//         JOIN member_info mi ON mi.member_sid = plm.member_sid 
//         JOIN post_board pb ON plm.board_sid = pb.board_sid 
//         ORDER BY postLike DESC;
//       `
//   );
//   // 最新文章（按日期）
//   const [lateD] = await db.query(
//     `
//         SELECT mi.member_sid, mi.nickname, plm.post_sid, plm.board_sid, plm.post_title, plm.post_date, 
//         CASE WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
//         ELSE plm.post_content END AS post_content, pb.board_name, 
//         (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file, 
//         (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
//         (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
//         (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist FROM post_list_member plm 
//         JOIN member_info mi ON mi.member_sid = plm.member_sid 
//         JOIN post_board pb ON plm.board_sid = pb.board_sid 
//         ORDER BY post_date DESC;
//         `
//   );

//   res.json({ data, lateD });
// });
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

// 個人頁面：收藏文章
router.get('/forum/blog/favlist', async (req, res) => {
  const output = {
    success: false,
    error: "",
    data: null,
    totalRows: 0,
    perPage: 15,
    totalPages: 0,
    page: 1,
    rows: [],
  };

  if (!res.locals.jwtData) {
    output.error = "沒有驗證";
    return res.json(output);
  }

  console.log(res.locals.jwtData.id);

  const sid = res.locals.jwtData.id;
  const page = parseInt(req.query.page) || 1;
  const perPage = output.perPage;
  const offset = (page - 1) * perPage;

  // 使用子查詢來獲取 totalRows 和 favData
  const [result] = await db.query(
    `
    SELECT 
      (SELECT COUNT(1) FROM post_favlist pf WHERE pf.member_sid = '${sid}') AS totalRows,
      plm.post_title, plm.post_content, plm.post_date, plm.update_date, pb.board_name, mi.nickname AS author_nickname, mi.profile, pf.member_sid, pf_member.nickname AS favorite_nickname,
      CASE 
        WHEN CHAR_LENGTH(plm.post_content) > 70 THEN CONCAT(SUBSTRING(plm.post_content, 1, 70), '...') 
        ELSE plm.post_content 
      END AS post_content, pb.board_name, 
      (SELECT file FROM post_file pfile WHERE pfile.post_sid = plm.post_sid ORDER BY pfile.file_type LIMIT 1) AS file,
      (SELECT COUNT(1) FROM post_like pl WHERE pl.post_sid = plm.post_sid) AS postLike, 
      (SELECT COUNT(1) FROM post_comment pc WHERE pc.post_sid = plm.post_sid) AS postComment, 
      (SELECT COUNT(1) FROM post_favlist pf WHERE pf.post_sid = plm.post_sid) AS postFavlist 
    FROM post_favlist pf
    JOIN post_list_member plm ON plm.post_sid = pf.post_sid
    JOIN post_board pb ON pb.board_sid = plm.board_sid
    JOIN member_info mi ON mi.member_sid = plm.member_sid
    JOIN member_info pf_member ON pf_member.member_sid = pf.member_sid
    WHERE pf.member_sid = '${sid}'
    ORDER BY post_date DESC
    LIMIT ${offset}, ${perPage};;
  `
  );

  if (result.length > 0) {
    output.success = true;
    output.totalRows = result[0].totalRows;
    output.totalPages = Math.ceil(result[0].totalRows / perPage);
    output.page = page;
    output.rows = result;
  }

  res.json(output);
});


// 判斷會員有沒有按讚這篇文章
router.get('/forum/likeStatus', async(req, res)=>{
  const member_sid = req.query.member_sid;
  const post_sid = req.query.post_sid ;
  console.log('member_sid',member_sid);
  console.log('post_sid',post_sid);
  const sql = `SELECT * FROM post_like WHERE member_sid=? AND post_sid=? `;
  console.log(sql);
  const [result] = await db.query(sql,[member_sid, post_sid])
  console.log(result);
  res.json(result);

})

// 新增讚
router.post('/forum/postLike', async(req, res)=>{
  const member_sid = req.body.member_sid;
  const post_sid = req.body.post_sid ;
  const likeSql = `INSERT INTO post_like (post_sid, member_sid, like_time) VALUES (?, ?, NOW())`;
  const [likeResult] = await db.query(likeSql, [post_sid, member_sid]);
  console.log(likeResult);
  res.json(likeResult);
}

)

// 刪除讚
router.delete('/forum/likeDel',async(req, res)=>{
  const member_sid = req.body.member_sid;
  const post_sid = req.body.post_sid ;
  const delSql = `DELETE FROM post_like WHERE post_sid=? AND member_sid=?`;
  const [delResult] = await db.query(delSql,[post_sid, member_sid]);
  res.json(delResult);
})

// 新增留言
router.post('/forum/addcomment',async(req, res)=>{
   const member_sid = req.body.member_sid;
   const post_sid = req.body.post_sid ;
   const comment_content = req.body.comment_content;
  // 新增留言sql
  const sql = `INSERT INTO post_comment(post_sid, member_sid, parent_sid, comment_content, comment_date) 
  VALUES (?,?,'0',?,NOW())`
  const [result] = await db.query(sql,[post_sid, member_sid, comment_content]);
  console.log(result);

  // 抓最新留言資料放到前端頁面
  const [commentData] = await db.query(
      `
          SELECT pc.comment_content, pc.comment_date, pc.member_sid, mi.nickname, mi.member_sid, mi.profile FROM post_comment pc 
          JOIN member_info mi ON mi.member_sid = pc.member_sid
          JOIN post_list_member plm ON plm.post_sid = pc.post_sid
          WHERE plm.post_sid = '${post_sid}' ORDER BY pc.comment_date DESC;
          `
    );

  const newCommentData = commentData.map((v) => ({
    ...v,
    comment_date: res.toDatetimeString(v.comment_date),
  }));
  res.json({result, newCommentData});
})

// 新增收藏
router.post('/forum/addFav', async (req, res) => {
  try {
    const member_sid = req.body.member_sid;
    const post_sid = req.body.post_sid;
    const list_name = req.body.list_name;
    const sql = `INSERT INTO post_favlist(list_name, post_sid, member_sid, favorites_date) VALUES (?,?,?,NOW())`;
    console.log(sql);
    const [favResult] = await db.query(sql, [list_name, post_sid, member_sid]);
    console.log(favResult);
    res.json(favResult);
  } catch (error) {
    // 發生錯誤時執行這裡的程式碼
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Error adding favorite' });
  }
});


// 取消收藏
router.delete('/forum/delFav',async(req, res)=>{
  const member_sid = req.body.member_sid;
  const post_sid = req.body.post_sid ;
  const sql = `DELETE FROM post_favlist WHERE post_sid=? AND member_sid=?`
  const [delFavResult] = await db.query(sql,[post_sid, member_sid]);
  // const [delFavResult] = await db.query(sql);
  console.log(delFavResult);
  res.json(delFavResult);
})

// 判斷會員有沒有收藏這篇文章
router.get('/forum/favStatus', async(req, res)=>{
  const member_sid = req.query.member_sid;
  const post_sid = req.query.post_sid ;
  console.log('member_sid',member_sid);
  console.log('post_sid',post_sid);
  const sql = `SELECT * FROM post_favlist WHERE member_sid=? AND post_sid=? `;
  console.log(sql);
  const [result] = await db.query(sql,[member_sid, post_sid])
  console.log(result);
  res.json(result);

})


// 選取看板出現對應話題
router.get('/forum/blog/hashtag', async (req, res) => {
  const hashtagData = `SELECT board_sid, hashtag_name FROM board_hashtag WHERE 1;`;
  const result = await db.query(hashtagData);

  // 解構最外層的陣列，並取得第一個陣列
  const [firstArray] = result;

  res.json(firstArray); // 回傳第一個陣列
});


// 新增文章
//router.post('/forum/blog/post' , upload.array([]), async(req, res)=>{
  router.post('/forum/blog/post' , async(req, res)=>{
  const member_sid = req.body.memberSid;
  const board_sid = req.body.boardSid;
  const post_title = req.body.title;
  const post_content = req.body.content;

  // 新增文章標題 // 新增文章內容
  const postSql = `INSERT INTO post_list_member(member_sid, board_sid, post_title, post_content, post_date, post_type, pet_sid, update_date, post_status) 
  VALUES (?,?,?,?,NOW(),'P01',NULL,NULL,0)`;
  const [result] = await db.query(postSql, [member_sid,board_sid, post_title, post_content]);
  console.log(result); 
  // res.json(result)

  // 從資料庫拿最新文章的post sid
  const [maxSid] = await db.query(`SELECT MAX(post_sid) as maxSid FROM post_list_member`)
  const mySid = maxSid[0].maxSid;

  // 拿到的hashtags資料
  const hashtags = req.body.choseHashtag;
  const addhsResult = []
  for(let ht of hashtags){
    const addHashTagsql = `INSERT INTO post_hashtag(hashtag_name, post_sid) VALUES (?,?)`
    const [addHTresult] = await db.query(addHashTagsql, [ht,mySid]);
    addhsResult.push(addHTresult);
  }
  res.json({result, addhsResult})
})











module.exports = router;



