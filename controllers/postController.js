const postModel = require('../models/post');
const commentModel = require('../models/comment');
const likeModel = require('../models/like');
const pool = require('../config/database');
const { createNotification } = require('./subscriptionController');
const statsStore = require('../utils/statsStore');

async function createPost(req, res, next) {
  try {
    const { title, content, status } = req.body;
    let categories = req.body.categories;

    // If images were uploaded by the route, they are passed in req.body.images as an
    // array of public paths like '/uploads/filename'. If present, append them to
    // the content so they are visible in the post detail view without DB schema changes.
    let contentToSave = content || '';
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length) {
      const imgsHtml = req.body.images.map(u => `<p><img src="${u}" style="max-width:100%;height:auto"/></p>`).join('');
      contentToSave = (contentToSave || '') + imgsHtml;
    }

    // Normalize categories: accept array, comma-separated string, or JSON array string
    if (!categories) {
      categories = [];
    } else if (Array.isArray(categories)) {
      categories = categories.map(id => Number(id));
    } else if (typeof categories === 'string') {
      const raw = categories.trim();
      // try JSON parse first (e.g. '["1","2"]')
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          categories = parsed.map(id => Number(id));
        } else {
          // fallback to comma-split
          categories = raw.split(',').map(id => Number(id.trim()));
        }
      } catch (e) {
        // not JSON, split by comma
        categories = raw.split(',').map(id => Number(id.trim()));
      }
    } else {
      // unknown shape, coerce to array
      categories = [Number(categories)];
    }
    // filter out invalid numbers
    categories = categories.map(x => Number(x)).filter(x => Number.isFinite(x));

  const authorId = req.user.id;
  const postId = await postModel.createPost({ authorId, title, content: contentToSave, status: status || 'active' });
    
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
    // Allow admins and post author to view inactive posts
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.status === 'inactive') {
      const isAdmin = req.user && req.user.role === 'admin';
      const isAuthor = req.user && Number(req.user.id) === Number(post.author_id);
      if (!isAdmin && !isAuthor) return res.status(404).json({ success: false, error: 'Not found' });
    }
    // increment post view statistics (lightweight file-based store)
    try { statsStore.incrementPost(id); } catch(e) { /* ignore */ }
    // Attach subscription info: total subscribers and whether current user is subscribed
    try {
      const [subCountRows] = await pool.query('SELECT COUNT(*) as cnt FROM post_subscriptions WHERE post_id = ?', [id]);
      post.subscribers_count = Number((subCountRows[0] && subCountRows[0].cnt) ? subCountRows[0].cnt : 0);
      if (req.user && req.user.id) {
        const [isRows] = await pool.query('SELECT 1 FROM post_subscriptions WHERE post_id = ? AND user_id = ? LIMIT 1', [id, req.user.id]);
        post.is_subscribed = Array.isArray(isRows) && isRows.length > 0;
      } else {
        post.is_subscribed = false;
      }
    } catch (e) {
      // Non-fatal: if subscription queries fail, leave defaults
      post.subscribers_count = post.subscribers_count || 0;
      post.is_subscribed = post.is_subscribed || false;
    }
    res.json({ success: true, post });
  } catch (err) { next(err); }
}

async function listPosts(req, res, next) {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      sort = 'likes', 
      categories, 
      dateFrom, 
      dateTo, 
      status,
      includeInactive 
    } = req.query;
    const authorId = req.query.authorId;
    
  let categoryIds = categories ? (Array.isArray(categories) ? categories : categories.split(',')) : [];
  // Determine whether the current requester is admin/author so we can decide status filter
  const isAdmin = req.user && req.user.role === 'admin';
  const isAuthor = req.user && authorId && Number(req.user.id) === Number(authorId);
  // Compute finalStatus: if includeInactive requested and caller is admin or the author, show all (no status filter).
  let finalStatus;
  if (includeInactive === 'true' && (isAdmin || isAuthor)) {
    finalStatus = null;
  } else {
    // if status explicitly provided, honor it; otherwise default to 'active' for non-admins/authors
    finalStatus = status !== undefined && status !== null ? status : 'active';
  }
  // normalize to numbers
  categoryIds = (categoryIds || []).map(x => Number(x)).filter(x => Number.isFinite(x));
    
    // Determine whether to include inactive posts: only for admins or the author specified by authorId
    

    const result = await postModel.listPosts({ 
      page: Number(page), 
      pageSize: Number(pageSize), 
      sort, 
      categoryIds, 
      dateFrom, 
      dateTo, 
      status: finalStatus,
      authorId: authorId || null,
      currentUserId: req.user ? req.user.id : null,
      currentUserIsAdmin: req.user ? req.user.role === 'admin' : false
    });

    // result now contains { posts, total }
    const posts = result.posts || [];
    const total = Number(result.total || posts.length);

    // lightweight home view increment: count visits to page 1
    try { if (Number(page) === 1) statsStore.incrementHome(); } catch(e){ }

    res.json({ success: true, posts, total });
  } catch (err) { 
    next(err); 
  }
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

    // If images were uploaded for update, append them to the content. Use existing
    // post content as base if client didn't send a new content field.
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length) {
      const imgsHtml = req.body.images.map(u => `<p><img src="${u}" style="max-width:100%;height:auto"/></p>`).join('');
      if (fields.content !== undefined) {
        fields.content = String(fields.content || '') + imgsHtml;
      } else {
        fields.content = (postRow.content || '') + imgsHtml;
      }
    }

    // Only update content if provided and allowed (author). Status changes are allowed for authors and admins.
    const fieldsToUpdate = {};
    if (fields.title !== undefined) fieldsToUpdate.title = fields.title;
    // Allow content updates if the requester is the author or an admin
    if (fields.content !== undefined && (req.user.role === 'admin' || Number(req.user.id) === Number(postRow.author_id))) {
      fieldsToUpdate.content = fields.content;
    }
    if (fields.status !== undefined) fieldsToUpdate.status = fields.status;

    if (Object.keys(fieldsToUpdate).length) {
      await postModel.updatePost(id, fieldsToUpdate);
      await createNotification('post_updated', id, req.user.id, 
        `Post "${postRow.title}" was updated`);
    }

    if (req.body.categories) {
      // normalize categories from the request body similar to createPost
      let cats = req.body.categories;
      if (!cats) cats = [];
      else if (Array.isArray(cats)) cats = cats.map(v => Number(v));
      else if (typeof cats === 'string') {
        try { const parsed = JSON.parse(cats); cats = Array.isArray(parsed) ? parsed.map(v => Number(v)) : cats.split(',').map(v=>Number(v.trim())); }
        catch(e){ cats = cats.split(',').map(v=>Number(v.trim())); }
      } else cats = [Number(cats)];
      cats = cats.map(x=>Number(x)).filter(x=>Number.isFinite(x));

      await pool.query('DELETE FROM post_categories WHERE post_id = ?', [id]);
      if (cats.length) {
        await postModel.attachCategories(id, cats);
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
    // Adjust author's rating by subtracting net likes for this post before deletion.
    try {
      const [r] = await pool.query(`SELECT COALESCE(SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END),0) as like_sum FROM likes WHERE post_id = ?`, [id]);
      const likeSum = (r[0] && r[0].like_sum) ? Number(r[0].like_sum) : 0;
      if (likeSum && postRow.author_id) {
        await pool.query(`UPDATE users SET rating = rating - ? WHERE id = ?`, [likeSum, postRow.author_id]);
      }
    } catch (e) {
      // If DB-level adjustment fails, continue with deletion but log the error
      console.error('Failed to adjust user rating before post delete', e);
    }

    await postModel.deletePost(id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function addComment(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const { content, parentCommentId } = req.body;
    const post = await postModel.getPostById(postId);
    if (!post || post.status !== 'active') return res.status(400).json({ success: false, error: 'Cannot comment' });
    const commentId = await commentModel.createComment({ authorId: req.user.id, postId, content, parentId: parentCommentId || null });
    await createNotification('new_comment', postId, req.user.id, 
      `New comment added to "${post.title}"`);
    res.json({ success: true, commentId });
  } catch (err) { next(err); }
}

async function listComments(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await postModel.getPostById(postId);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.status === 'inactive') {
      const isAdmin = req.user && req.user.role === 'admin';
      const isAuthor = req.user && Number(req.user.id) === Number(post.author_id);
      if (!isAdmin && !isAuthor) return res.status(404).json({ success: false, error: 'Not found' });
    }
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

    const chosenType = type === 'dislike' ? 'dislike' : 'like';
    const result = await likeModel.toggleLike({ authorId: req.user.id, postId, commentId, type: chosenType });
    // Note: do NOT modify user_favorites here — likes/dislikes only affect counts/rating.
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

// Express handler that returns likes for a post, respecting post visibility (inactive posts only for author/admin)
async function getPostLikesHandler(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await postModel.getPostById(postId);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.status === 'inactive') {
      const isAdmin = req.user && req.user.role === 'admin';
      const isAuthor = req.user && Number(req.user.id) === Number(post.author_id);
      if (!isAdmin && !isAuthor) return res.status(404).json({ success: false, error: 'Not found' });
    }
    const likes = await getPostLikes(postId);
    res.json({ success: true, likes });
  } catch (err) { next(err); }
}

async function togglePostLock(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const adminId = req.user.id;
    
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
    const post = await postModel.getPostById(postId);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.status === 'inactive') {
      const isAdmin = req.user && req.user.role === 'admin';
      const isAuthor = req.user && Number(req.user.id) === Number(post.author_id);
      if (!isAdmin && !isAuthor) return res.status(404).json({ success: false, error: 'Not found' });
    }

    const query = `
      SELECT c.* 
      FROM categories c
      JOIN post_categories pc ON c.id = pc.category_id 
      WHERE pc.post_id = ?
    `;
    const [categories] = await pool.query(query, [postId]);

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
    // Do not modify user_favorites here; removing a like should not remove favorites automatically.
    
    res.json({ success: true, message: 'Like removed successfully' });
  } catch (err) {
    next(err);
  }
}

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
  getPostLikesHandler,
  togglePostLock,
  getPostCategories,
  deleteLike
};
