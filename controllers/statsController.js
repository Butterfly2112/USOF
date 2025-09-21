async function getUserStats(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    
    const [postsStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_posts,
        AVG(
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'like')
        ) as avg_likes_per_post
      FROM posts p WHERE author_id = ?
    `, [userId]);
    
    const [commentsStats] = await pool.query(`
      SELECT COUNT(*) as total_comments
      FROM comments WHERE author_id = ?
    `, [userId]);
    
    const [likesStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_likes_given,
        SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) as likes_given,
        SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) as dislikes_given
      FROM likes WHERE author_id = ?
    `, [userId]);
    
    res.json({
      success: true,
      stats: {
        posts: postsStats[0],
        comments: commentsStats[0],
        likes: likesStats[0]
      }
    });
  } catch (err) {
    next(err);
  }
}