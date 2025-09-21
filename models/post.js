// models/post.js
const pool = require('../config/database');

async function createPost({ authorId, title, content, status='active', publishDate = null }) {
  const pd = publishDate ? publishDate : new Date();
  const [res] = await pool.query(`INSERT INTO posts (author_id, title, content, status, publishDate) VALUES (?, ?, ?, ?, ?)`, [authorId, title, content, status, pd]);
  return res.insertId;
}

// add categories many-to-many
async function attachCategories(postId, categoryIds = []) {
  if (!categoryIds || categoryIds.length === 0) return;
  const values = categoryIds.map(cid => [postId, cid]);
  await pool.query(`INSERT INTO post_categories (post_id, category_id) VALUES ?`, [values]);
}

async function updatePost(id, fields) {
  const cols = [], vals=[];
  for (const [k,v] of Object.entries(fields)) { cols.push(`${k} = ?`); vals.push(v); }
  vals.push(id);
  await pool.query(`UPDATE posts SET ${cols.join(', ')} WHERE id = ?`, vals);
}

async function deletePost(id) {
  await pool.query(`DELETE FROM posts WHERE id = ?`, [id]);
}

async function getPostById(id) {
  const [rows] = await pool.query(`
    SELECT p.*, u.login as authorLogin, u.fullName as authorName,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'like') as likesCount,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.type = 'dislike') as dislikesCount
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = ?`, [id]);
  if (!rows[0]) return null;
  // categories
  const [cats] = await pool.query(`SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?`, [id]);
  rows[0].categories = cats;
  return rows[0];
}

// list with filtering + sorting + pagination
async function listPosts({ page=1, pageSize=10, sort='likes', categoryIds = [], dateFrom, dateTo, status='active' }) {
  const offset = (page-1)*pageSize;
  const wh = [];
  const vals = [];
  if (status) { wh.push('p.status = ?'); vals.push(status); }
  if (dateFrom) { wh.push('p.publishDate >= ?'); vals.push(dateFrom); }
  if (dateTo) { wh.push('p.publishDate <= ?'); vals.push(dateTo); }
  let whereSql = wh.length ? 'WHERE ' + wh.join(' AND ') : '';

  // base query: if sort by likes => left join aggregated likes
  const order = (sort === 'date') ? 'p.publishDate DESC' : 'COALESCE(likes_count,0) DESC, p.publishDate DESC';

  // If category filter: use EXISTS
  if (categoryIds && categoryIds.length) {
    whereSql += (whereSql ? ' AND ' : 'WHERE ') + `EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.id AND pc.category_id IN (?))`;
    vals.push(categoryIds);
  }

  const sql = `
    SELECT p.*, u.login as authorLogin,
      COALESCE(likes_count,0) as likes_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN (
      SELECT post_id, SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END) as likes_count
      FROM likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    ${whereSql}
    ORDER BY ${order}
    LIMIT ? OFFSET ?`;

  vals.push(Number(pageSize), Number(offset));
  const [rows] = await pool.query(sql, vals);
  return rows;
}

module.exports = { createPost, attachCategories, updatePost, deletePost, getPostById, listPosts };
