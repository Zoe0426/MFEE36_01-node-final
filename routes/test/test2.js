// 新增文章
//router.post('/forum/blog/post' , upload.array([]), async(req, res)=>{
  router.post('/forum/blog/post' , async(req, res)=>{
  const member_sid = req.body.memberSid;
  // const post_sid = req.body.post_sid ;
  const board_sid = req.body.boardSid;
  const post_title = req.body.title;
  const post_content = req.body.content;
  // const hashtag_name = req.query.hashtag_name;

  // 新增文章標題 // 新增文章內容
  const postSql = `INSERT INTO post_list_member(member_sid, board_sid, post_title, post_content, post_date, post_type, pet_sid, update_date, post_status) 
  VALUES (?,?,?,?,NOW(),'P01',NULL,NULL,0)`;
  const [result] = await db.query(postSql, [member_sid,board_sid, post_title, post_content]);
  console.log(result); 

    //從資料庫拿最新文章的post sid
    const [maxSid] = await db.query(`SELECT MAX(post_sid) as maxSid FROM post_list_member`)
    const mySid = maxSid[0].maxSid;

    //拿到的hts資料
    const hashtags = req.body.choseHashtag;


    for (let ht of hashtags){
            const addHashTagsql = `INSERT INTO post_hashtag(hashtag_name, post_sid,)
                            VALUES (?,?)`

    const [addHTresult] = await db.query(addHashTagsql,[ht,mySid ]);
    res.json({result, addHTresult})

    }

  // 選取話題 (選看板資料表的話題(不知對不對))
  // const tagSql = `SELECT board_sid, hashtag_name FROM board_hashtag WHERE 1`;

  // 抓全部的文章資料到前端 (應該可以不用？)
  // res.json({boardSql,result,tagSql,post_sid,hashtag_name});
  res.json(result)

})