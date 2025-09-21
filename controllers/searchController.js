async function searchPosts(req, res, next) {
  try {
    const { q, page = 1, pageSize = 10, sort = 'relevance' } = req.query;
    const offset = (page - 1) * pageSize;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Search query too short' });
    }
    
    const searchTerm = `%${q.trim()}%`;
    const orderBy = sort === 'date' ? 'p.publish_date DESC' : 
                   sort === 'likes' ? 'likes_count DESC' : 
                   'relevance_score DESC';
    
    const query = `
      SELECT p.*, u.login as authorLogin,
        COALESCE(lc.likes_count, 0) as likes_count,
        (
          CASE WHEN p.title LIKE ? THEN 3 ELSE 0 END +
          CASE WHEN p.content LIKE ? THEN 1 ELSE 0 END
        ) as relevance_score
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT post_id, SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END) as likes_count
        FROM likes GROUP BY post_id
      ) lc ON lc.post_id = p.id
      WHERE p.status = 'active' AND (p.title LIKE ? OR p.content LIKE ?)
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const [results] = await pool.query(query, [
      searchTerm, searchTerm, searchTerm, searchTerm, pageSize, offset
    ]);
    
    res.json({ success: true, results, query: q });
  } catch (err) {
    next(err);
  }
}