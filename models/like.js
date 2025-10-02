const pool = require('../config/database');

async function toggleLike({ authorId, postId = null, commentId = null, type = 'like' }) {
  // Ensure only one of postId/commentId is provided
  const targetCol = postId ? 'post_id' : 'comment_id';
  const targetId = postId || commentId;
  
  // Check if user already has a like/dislike on this target
  const [rows] = await pool.query(`SELECT * FROM likes WHERE author_id = ? AND ${targetCol} = ? LIMIT 1`, [authorId, targetId]);
  
  if (rows[0]) {
    // If same type -> remove (toggle off); if different type -> update
    if (rows[0].type === type) {
      await pool.query(`DELETE FROM likes WHERE id = ?`, [rows[0].id]);
      return { action: 'removed' };
    } else {
      await pool.query(`UPDATE likes SET type = ?, publish_date = ? WHERE id = ?`, [type, new Date(), rows[0].id]);
      return { action: 'updated' };
    }
  } else {
    // Create new like/dislike
    const [res] = await pool.query(`INSERT INTO likes (author_id, ${targetCol}, type, publish_date) VALUES (?, ?, ?, ?)`, [authorId, targetId, type, new Date()]);
    return { action: 'created', id: res.insertId };
  }
}

module.exports = { toggleLike };
