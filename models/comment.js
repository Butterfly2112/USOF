const pool = require('../config/database');

async function createComment({ authorId, postId, content, parentId = null, publishDate = null }) {
  // Use current date if publishDate not provided
  const pd = publishDate ? publishDate : new Date();
  const [res] = await pool.query(`INSERT INTO comments (author_id, post_id, parent_id, content, publish_date) VALUES (?, ?, ?, ?, ?)`, [authorId, postId, parentId, content, pd]);
  return res.insertId;
}

async function getCommentsByPost(postId) {
  const [rows] = await pool.query(`
    SELECT c.*, u.login as authorLogin,
      p.id as parent_id, p.content as parent_content, pu.login as parent_author_login,
      (SELECT COALESCE(SUM(CASE 
          WHEN type='like' THEN 1 
          WHEN type='love' THEN 2 
          WHEN type='wow' THEN 1 
          WHEN type='laugh' THEN 0 
          WHEN type='sad' THEN -1 
          WHEN type='angry' THEN -2 
          WHEN type='dislike' THEN -1 
          ELSE 0 END),0) FROM likes l WHERE l.comment_id = c.id) as score,
      (SELECT COALESCE(SUM(CASE WHEN type='like' THEN 1 ELSE 0 END),0) FROM likes l2 WHERE l2.comment_id = c.id) as likes_count,
      (SELECT COALESCE(SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END),0) FROM likes l3 WHERE l3.comment_id = c.id) as dislikes_count
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN comments p ON p.id = c.parent_id
    LEFT JOIN users pu ON pu.id = p.author_id
    WHERE c.post_id = ?
    ORDER BY score ASC, c.publish_date ASC
  `, [postId]);

  // add a short excerpt of parent content for frontend convenience
  const normalized = rows.map(r => ({
    ...r,
    likes_count: Number(r.likes_count || 0),
    dislikes_count: Number(r.dislikes_count || 0),
    parent_excerpt: r.parent_content ? String(r.parent_content).replace(/<[^>]+>/g, '').substring(0, 140) : null
  }));

  return normalized;
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
