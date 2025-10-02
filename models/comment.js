const pool = require('../config/database');

async function createComment({ authorId, postId, content, publishDate = null }) {
  // Use current date if publishDate not provided
  const pd = publishDate ? publishDate : new Date();
  const [res] = await pool.query(`INSERT INTO comments (author_id, post_id, content, publish_date) VALUES (?, ?, ?, ?)`, [authorId, postId, content, pd]);
  return res.insertId;
}

async function getCommentsByPost(postId) {
  const [rows] = await pool.query(`
    SELECT c.*, u.login as authorLogin,
      (SELECT SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END) FROM likes l WHERE l.comment_id = c.id) as score
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.post_id = ?
    ORDER BY c.publish_date ASC
  `, [postId]);
  return rows;
}

async function updateComment(id, fields) {
  // Build dynamic UPDATE query from fields object
  const cols = [], vals=[];
  for (const [k,v] of Object.entries(fields)) { cols.push(`${k} = ?`); vals.push(v); }
  vals.push(id);
  await pool.query(`UPDATE comments SET ${cols.join(', ')} WHERE id = ?`, vals);
}

async function deleteComment(id) {
  await pool.query(`DELETE FROM comments WHERE id = ?`, [id]);
}

module.exports = { createComment, getCommentsByPost, updateComment, deleteComment };
