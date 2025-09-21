const postModel = require('../models/post');
const commentModel = require('../models/comment');
const likeModel = require('../models/like');
const pool = require('../config/database');

async function createPost(req, res, next) {
  try {
    const { title, content, status } = req.body;
    let categories = req.body.categories;
    if (categories && typeof categories === 'string') {
      categories = categories.split(',').map(id => Number(id.trim()));
    } else if (!categories) {
      categories = [];
    }


    const authorId = req.user.id;
    const postId = await postModel.createPost({ authorId, title, content, status: status || 'active' });
    
    if (categories && categories.length > 0) {
      await postModel.attachCategories(postId, categories);
    }
    
    res.json({ success: true, postId });
  } catch (err) { next(err); }
}
async function getPost(req, res, next) {
  try {
    const id = req.params.postId;
    const post = await postModel.getPostById(id);
    if (!post || post.status === 'inactive' && req.user?.role !== 'admin') return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, post });
  } catch (err) { next(err); }
}

async function listPosts(req, res, next) {
  try {
    const { page=1, pageSize=10, sort='likes', categories, dateFrom, dateTo, status='active' } = req.query;
    let catIds = categories ? (Array.isArray(categories) ? categories : categories.split(',')) : [];
    const posts = await postModel.listPosts({ page: Number(page), pageSize: Number(pageSize), sort, categoryIds: catIds, dateFrom, dateTo, status });
    res.json({ success: true, posts });
  } catch (err) { next(err); }
}

async function updatePost(req, res, next) {
  try {
    const id = Number(req.params.postId);
    const postRow = await postModel.getPostById(id);
    if (!postRow) return res.status(404).json({ success: false, error: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== postRow.author_id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const allowed = ['title', 'content', 'status'];
    const fields = {};
    for (const a of allowed) if (req.body[a] !== undefined) fields[a] = req.body[a];
    if (Object.keys(fields).length) await postModel.updatePost(id, fields);

    // categories update (optional)
    if (req.body.categories) {
      // simple approach: delete old links, attach new
      await pool.query('DELETE FROM post_categories WHERE post_id = ?', [id]);
      if (req.body.categories.length) {
        await postModel.attachCategories(id, req.body.categories);
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.postId);
    const postRow = await postModel.getPostById(id);
    if (!postRow) return res.status(404).json({ success: false, error: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== postRow.author_id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await postModel.deletePost(id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function addComment(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const { content } = req.body;
    const post = await postModel.getPostById(postId);
    if (!post || post.status !== 'active') return res.status(400).json({ success: false, error: 'Cannot comment' });
    const id = await commentModel.createComment({ authorId: req.user.id, postId, content });
    res.json({ success: true, commentId: id });
  } catch (err) { next(err); }
}

async function listComments(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const comments = await commentModel.getCommentsByPost(postId);
    res.json({ success: true, comments });
  } catch (err) { next(err); }
}

async function like(req, res, next) {
  try {
    const { type } = req.body; // 'like' | 'dislike'
    const postId = req.params.postId ? Number(req.params.postId) : null;
    const commentId = req.params.commentId ? Number(req.params.commentId) : null;
    if (!postId && !commentId) return res.status(400).json({ success: false, error: 'No target' });

    const result = await likeModel.toggleLike({ authorId: req.user.id, postId, commentId, type: type === 'dislike' ? 'dislike' : 'like' });
    res.json({ success: true, result });
  } catch (err) { next(err); }
}

async function getPostLikes(postId) {
  const query = `
    SELECT * FROM likes
    WHERE post_id = ?
  `;
  const [likes] = await pool.query(query, [postId]);
  return likes;
}

async function togglePostLock(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const adminId = req.user.id;
    
    // Проверить существование поста
    const [posts] = await pool.query('SELECT locked FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    const newLockStatus = !posts[0].locked;
    const lockedBy = newLockStatus ? adminId : null;
    const lockedAt = newLockStatus ? new Date() : null;
    
    await pool.query(
      'UPDATE posts SET locked = ?, locked_by = ?, locked_at = ? WHERE id = ?',
      [newLockStatus, lockedBy, lockedAt, postId]
    );
    
    res.json({ 
      success: true, 
      message: `Post ${newLockStatus ? 'locked' : 'unlocked'} successfully`,
      locked: newLockStatus 
    });
  } catch (err) {
    next(err);
  }
}

async function getPostCategories(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    
    const [categories] = await pool.query(`
      SELECT c.* FROM categories c
      JOIN post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = ?
    `, [postId]);
    
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

async function deleteLike(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user.id;
    
    await pool.query(
      'DELETE FROM likes WHERE author_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    res.json({ success: true, message: 'Like removed successfully' });
  } catch (err) {
    next(err);
  }
}

// В методе listPosts добавить логику:

async function listPosts(filters, userId = null, userRole = null) {
  // ...existing code...
  
  // Если пользователь авторизован и не админ - показать активные + свои неактивные
  if (userId && userRole !== 'admin') {
    whereSql += (whereSql ? ' AND ' : 'WHERE ') + '(p.status = "active" OR (p.status = "inactive" AND p.author_id = ?))';
    vals.push(userId);
  } else if (!userId || userRole !== 'admin') {
    // Неавторизованные или обычные пользователи - только активные
    whereSql += (whereSql ? ' AND ' : 'WHERE ') + 'p.status = "active"';
  }
  // Админы видят все посты
  
  // ...existing code...
}

// Экспорт функций
module.exports = {
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  addComment,
  listComments,
  like,
  getPostLikes,
  togglePostLock,
  getPostCategories,
  deleteLike
};
