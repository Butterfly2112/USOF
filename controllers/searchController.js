const pool = require('../config/database');

async function search(req, res, next) {
  try {
    const { q, type = 'posts', page = 1, pageSize = 10, sort = 'relevance' } = req.query;
    
    // Validate search query length
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Search query too short' });
    }
    
    // Route to appropriate search function based on type
    switch (type.toLowerCase()) {
      case 'posts':
        return await searchPosts(req, res, next);
      case 'users':
        return await searchUsers(req, res, next);
      default:
        return res.status(400).json({ success: false, error: 'Invalid search type. Use: posts, users' });
    }
  } catch (err) {
    next(err);
  }
}

async function searchUsers(req, res, next) {
  try {
    // Coerce pagination params to integers to avoid quoted LIMIT/OFFSET in SQL
    const q = req.query.q;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || 10, 10));
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${q.trim()}%`;
    
    const query = `
      SELECT id, login, email, fullName, role, created_at
      FROM users
      WHERE login LIKE ? OR fullName LIKE ? OR email LIKE ?
      ORDER BY 
        CASE WHEN login LIKE ? THEN 1 ELSE 2 END,
        login ASC
      LIMIT ? OFFSET ?
    `;
    
    const [results] = await pool.query(query, [
      searchTerm, searchTerm, searchTerm, searchTerm, pageSize, offset
    ]);
    
    res.json({ success: true, results, query: q, type: 'users' });
  } catch (err) {
    next(err);
  }
}

async function searchPosts(req, res, next) {
  try {
    // Coerce pagination params to integers to avoid quoted LIMIT/OFFSET in SQL
    const q = req.query.q;
    const sort = req.query.sort || 'relevance';
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || 10, 10));
    const offset = (page - 1) * pageSize;
    
    // Validate search query length
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Search query too short' });
    }
    
    const searchTerm = `%${q.trim()}%`;
    // Determine sorting order based on sort parameter
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
    
    // Pass search term 4 times: 2 for relevance calculation, 2 for WHERE clause
    // Ensure numeric values are passed as numbers (mysql2 will not quote numbers)
    const [results] = await pool.query(query, [
      searchTerm, searchTerm, searchTerm, searchTerm, pageSize, offset
    ]);
    
    res.json({ success: true, results, query: q, type: 'posts' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search,
  searchPosts,
  searchUsers
};