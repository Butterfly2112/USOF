const pool = require('../config/database');

async function createPost({ authorId, title, content, status='active', publishDate = null }) {
  const pd = publishDate ? publishDate : new Date();
  const [res] = await pool.query(`INSERT INTO posts (author_id, title, content, status, publish_date) VALUES (?, ?, ?, ?, ?)`, [authorId, title, content, status, pd]);
  return res.insertId;
}

// Attach categories through many-to-many relationship
async function attachCategories(postId, categoryIds = []) {
  if (!categoryIds || categoryIds.length === 0) return;
  // coerce to numbers and filter invalid ids
  const ids = categoryIds.map(x => Number(x)).filter(x => Number.isFinite(x));
  if (ids.length === 0) return;
  const values = ids.map(cid => [postId, cid]);
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
  (SELECT SUM(CASE WHEN type='like' THEN 1 WHEN type='love' THEN 1 WHEN type='wow' THEN 1 WHEN type='laugh' THEN 0 WHEN type='sad' THEN 0 WHEN type='angry' THEN 0 ELSE 0 END) FROM likes l WHERE l.post_id = p.id) as likesCount,
      (SELECT SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) FROM likes l WHERE l.post_id = p.id) as dislikesCount,
      (SELECT COALESCE(SUM(CASE 
             WHEN type='like' THEN 1 
             WHEN type='love' THEN 2 
             WHEN type='wow' THEN 1 
             WHEN type='laugh' THEN 0 
             WHEN type='sad' THEN -1 
             WHEN type='angry' THEN -2 
             WHEN type='dislike' THEN -1 
             ELSE 0 END),0) FROM likes l2 WHERE l2.post_id = p.id) as rating,
      (SELECT COUNT(*) FROM likes l3 WHERE l3.post_id = p.id) as total_reactions
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = ?`, [id]);
  if (!rows[0]) return null;
  
  const [cats] = await pool.query(`SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?`, [id]);
  rows[0].categories = cats;
  // normalize counts and add rating
  rows[0].likes_count = Number(rows[0].likesCount || 0);
  rows[0].dislikes_count = Number(rows[0].dislikesCount || 0);
  rows[0].rating = Number(rows[0].rating || 0);
  rows[0].total_reactions = Number(rows[0].total_reactions || 0);
  // Extract image URLs from content (useful if images were appended into content on upload)
  try {
    const html = rows[0].content || '';
    const srcs = [];
    const re = /<img[^>]+src=["']?([^\s"'>]+)["']?/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (m[1]) {
        // normalize backslashes to forward slashes for Windows paths
        let src = String(m[1]).replace(/\\/g, '/');
        // ensure src starts with a slash or http
        if (!src.startsWith('/') && !/^https?:\/\//i.test(src)) src = '/' + src;
        srcs.push(src);
      }
    }
    rows[0].images = srcs;

    // Also normalize src attributes inside the returned HTML content so older posts
    // that were saved with backslashes (Windows paths) will render images correctly
    // when inserted into the page via dangerouslySetInnerHTML.
    try {
      // Normalize src attributes
      let normalized = html.replace(/src=["']?([^"'>\s]+)["']?/gi, (match, p1) => {
        let fixed = String(p1).replace(/\\/g, '/');
        if (!fixed.startsWith('/') && !/^https?:\/\//i.test(fixed)) fixed = '/' + fixed;
        return `src="${fixed}"`;
      });
      // Remove any img tags that contain '[object' in the src (these come from incorrect
      // serializations like '/[object Object]' and produce broken requests like '/[object').
      normalized = normalized.replace(/<img[^>]*src=["'][^"'>]*object[^"'>]*["'][^>]*>/gi, '');
      rows[0].content = normalized;
    } catch (e) {
      // If normalization fails for any reason, keep original content
      rows[0].content = html;
    }
  } catch (e) { rows[0].images = []; }
  return rows[0];
}

// List posts with filtering, sorting and pagination
async function listPosts({ page=1, pageSize=10, sort='likes', categoryIds = [], dateFrom, dateTo, status='active', authorId = null, currentUserId = null, currentUserIsAdmin = false }) {
  const offset = (page-1)*pageSize;
  const wh = [];
  const vals = [];
  // Build WHERE conditions dynamically
  // Visibility rules:
  // - Admins see all posts (unless caller supplies a specific status)
  // - If requesting an author's page, and requester is that author, show their posts (including inactive)
  // - Otherwise, only show active posts to others
  if (currentUserIsAdmin) {
    // admin: apply explicit status filter only if provided (non-null/undefined)
    if (status !== null && status !== undefined) { wh.push('p.status = ?'); vals.push(status); }
    if (authorId !== null && authorId !== undefined && authorId !== '') { wh.push('p.author_id = ?'); vals.push(Number(authorId)); }
  } else {
    // not admin
    if (authorId !== null && authorId !== undefined && authorId !== '') {
      // viewing a specific author's posts
      if (currentUserId !== null && Number(currentUserId) === Number(authorId)) {
        // the author views their own page: do not filter by status (show active + inactive)
      } else {
        // others: only active posts by that author
        wh.push('p.status = ?'); vals.push('active');
      }
      // always constrain to the authorId when provided
      wh.push('p.author_id = ?'); vals.push(Number(authorId));
    } else {
      // general listing (not per-author): always show only active posts to everyone
      // Inactive posts should be visible only on the author's own page (when authorId is provided and equals currentUserId)
      wh.push('p.status = ?'); vals.push('active');
    }
  }
  if (dateFrom) { wh.push('p.publish_date >= ?'); vals.push(dateFrom); }
  if (dateTo) { wh.push('p.publish_date <= ?'); vals.push(dateTo); }
  let whereSql = wh.length ? 'WHERE ' + wh.join(' AND ') : '';

  // Determine sort order: support newest, oldest and likes
  let order;
  if (sort === 'date') {
    order = 'p.publish_date DESC'; // newest first
  } else if (sort === 'date_asc') {
    order = 'p.publish_date ASC'; // oldest first
  } else {
    // default: by likes (desc) then newest
    order = 'COALESCE(likes_count,0) DESC, p.publish_date DESC';
  }

  // Add category filter using EXISTS for many-to-many relationship
  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => '?').join(',');
    whereSql += (whereSql ? ' AND ' : 'WHERE ') + `EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.id AND pc.category_id IN (${placeholders}))`;
    vals.push(...categoryIds);
  }

  const sql = `
    SELECT p.*, u.login as authorLogin, u.fullName as authorName,
      COALESCE(lc.likes_count,0) as likes_count,
      COALESCE(lc.dislikes_count,0) as dislikes_count,
      COALESCE(lc.reaction_rating,0) as rating,
      COALESCE(lc.total_reactions,0) as total_reactions,
      COALESCE(ps.user_id IS NOT NULL, 0) as is_subscribed,
      COALESCE(sc.sub_count, 0) as subscribers_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN (
      SELECT post_id,
        SUM(CASE WHEN type='like' THEN 1 ELSE 0 END) as likes_count,
        SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) as dislikes_count,
        SUM(CASE 
          WHEN type='like' THEN 1 
          WHEN type='love' THEN 2 
          WHEN type='wow' THEN 1 
          WHEN type='laugh' THEN 0 
          WHEN type='sad' THEN -1 
          WHEN type='angry' THEN -2 
          WHEN type='dislike' THEN -1 
          ELSE 0 END) as reaction_rating,
        COUNT(*) as total_reactions
      FROM likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    LEFT JOIN post_subscriptions ps ON ps.post_id = p.id AND ps.user_id = ?
    LEFT JOIN (
      SELECT post_id, COUNT(*) as sub_count FROM post_subscriptions GROUP BY post_id
    ) sc ON sc.post_id = p.id
    ${whereSql}
    ORDER BY ${order}
    LIMIT ? OFFSET ?`;

  // values for paged query
  const valsForPaged = [(currentUserId || 0)].concat(vals).concat([Number(pageSize), Number(offset)]);
  const [rows] = await pool.query(sql, valsForPaged);

  // compute total count for pagination
  const countSql = `SELECT COUNT(DISTINCT p.id) as total FROM posts p ${whereSql}`;
  const [countRows] = await pool.query(countSql, vals);
  const total = (countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

  // normalize fields and add rating for each post
  const posts = rows.map(r => ({
    ...r,
    likes_count: Number(r.likes_count || 0),
    dislikes_count: Number(r.dislikes_count || 0),
    rating: Number(r.rating || 0),
    total_reactions: Number(r.total_reactions || 0)
  }));

  // For each post, extract image srcs from content and normalize src attributes
  for (const p of posts) {
    try {
      const html = p.content || '';
      const srcs = [];
      const re = /<img[^>]+src=["']?([^\s"'>]+)["']?/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        if (m[1]) {
          let src = String(m[1]).replace(/\\/g, '/');
          if (!src.startsWith('/') && !/^https?:\/\//i.test(src)) src = '/' + src;
          srcs.push(src);
        }
      }
      p.images = srcs;
      try {
        let normalized = html.replace(/src=["']?([^"'>\s]+)["']?/gi, (match, p1) => {
          let fixed = String(p1).replace(/\\/g, '/');
          if (!fixed.startsWith('/') && !/^https?:\/\//i.test(fixed)) fixed = '/' + fixed;
          return `src="${fixed}"`;
        });
        normalized = normalized.replace(/<img[^>]*src=["'][^"'>]*object[^"'>]*["'][^>]*>/gi, '');
        p.content = normalized;
      } catch (e) {
        p.content = html;
      }
    } catch (e) {
      p.images = [];
    }
    // normalize subscription boolean and subscribers_count
    p.is_subscribed = Boolean(p.is_subscribed);
    p.subscribers_count = Number(p.subscribers_count || 0);
  }

  // Attach categories for posts (many-to-many). This avoids extra DB calls from the client.
  if (posts.length > 0) {
    const postIds = posts.map(p => Number(p.id)).filter(x => Number.isFinite(x));
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const [catRows] = await pool.query(`
        SELECT pc.post_id, c.* FROM post_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.post_id IN (${placeholders})
      `, postIds);

      const map = {};
      for (const cr of catRows) {
        if (!map[cr.post_id]) map[cr.post_id] = [];
        map[cr.post_id].push({ id: cr.id, title: cr.title, description: cr.description });
      }

      for (const p of posts) {
        p.categories = map[p.id] || [];
      }
    }
  }

  return { posts, total };
}

module.exports = { createPost, attachCategories, updatePost, deletePost, getPostById, listPosts };
