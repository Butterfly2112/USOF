const pool = require('../config/database');

async function addToFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    
    // Check if post exists and is active
    const [posts] = await pool.query('SELECT id FROM posts WHERE id = ? AND status = "active"', [postId]);
    if (!posts.length) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Add to favorites (ignore duplicates)
    await pool.query(
      'INSERT IGNORE INTO user_favorites (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
    
    res.json({ success: true, message: 'Added to favorites' });
  } catch (err) {
    next(err);
  }
}

async function removeFromFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    
    await pool.query(
      'DELETE FROM user_favorites WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) {
    next(err);
  }
}

async function getFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    // Join favorites with posts and users, calculate likes/dislikes
    const query = `
      SELECT p.*, u.login as authorLogin, u.fullName as authorName,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'like') as likesCount,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'dislike') as dislikesCount,
        uf.created_at as favorited_at
      FROM user_favorites uf
      JOIN posts p ON uf.post_id = p.id
      JOIN users u ON p.author_id = u.id
      WHERE uf.user_id = ? AND p.status = 'active'
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [favorites] = await pool.query(query, [userId, pageSize, offset]);
    // normalize fields for frontend: provide likes_count and rating (likes - dislikes)
    const norm = favorites.map(f => ({
      ...f,
      likes_count: Number(f.likesCount || 0),
      dislikes_count: Number(f.dislikesCount || 0),
      rating: (Number(f.likesCount || 0) - Number(f.dislikesCount || 0))
    }));
    res.json({ success: true, favorites: norm });
  } catch (err) {
    next(err);
  }
}

  async function getFavoritesFromLikes(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;

      const query = `
        SELECT p.*, u.login as authorLogin, u.fullName as authorName,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'like') as likesCount,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'dislike') as dislikesCount,
          l.publish_date as liked_at
        FROM likes l
        JOIN posts p ON l.post_id = p.id
        JOIN users u ON p.author_id = u.id
        WHERE l.author_id = ? AND l.type = 'like' AND p.status = 'active'
        ORDER BY l.publish_date DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.query(query, [userId, pageSize, offset]);
      const norm = rows.map(f => ({
        ...f,
        likes_count: Number(f.likesCount || 0),
        dislikes_count: Number(f.dislikesCount || 0),
        rating: (Number(f.likesCount || 0) - Number(f.dislikesCount || 0))
      }));
      res.json({ success: true, favorites: norm });
    } catch (err) {
      next(err);
    }
  }

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getFavoritesFromLikes
};