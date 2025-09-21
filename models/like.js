// models/like.js
const pool = require('../config/database');

async function toggleLike({ authorId, postId = null, commentId = null, type = 'like' }) {
  // only one of postId/commentId allowed
  const targetCol = postId ? 'post_id' : 'comment_id';
  const targetId = postId || commentId;
  // check existing
  const [rows] = await pool.query(`SELECT * FROM likes WHERE author_id = ? AND ${targetCol} = ? LIMIT 1`, [authorId, targetId]);
  if (rows[0]) {
    // if same type -> remove (toggle off); if different -> update
    if (rows[0].type === type) {
      await pool.query(`DELETE FROM likes WHERE id = ?`, [rows[0].id]);
      return { action: 'removed' };
    } else {
      await pool.query(`UPDATE likes SET type = ?, publishDate = ? WHERE id = ?`, [type, new Date(), rows[0].id]);
      return { action: 'updated' };
    }
  } else {
    const [res] = await pool.query(`INSERT INTO likes (author_id, ${targetCol}, type, publishDate) VALUES (?, ?, ?, ?)`, [authorId, targetId, type, new Date()]);
    return { action: 'created', id: res.insertId };
  }
}

module.exports = { toggleLike };
