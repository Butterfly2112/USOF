const commentModel = require('../models/comment');
const pool = require('../config/database');

async function updateComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    // Behavior change: Admins may update any comment's content.
    // Regular users are NOT allowed to change another user's content here — they may only update their own comment content
    // or change status via the dedicated status endpoint. To accomodate callers that PATCH the comment resource to change
    // status, we accept { status: 'active'|'inactive' } from non-admin users and apply it (author-only).

    const { content, status } = req.body;

  // For non-admin users:
  // - If they provided status, allow updating status for their own comment (reuse existing rules)
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const [result] = await pool.query(
        `UPDATE comments SET status = ? WHERE id = ? AND author_id = ?`,
        [status, commentId, req.user.id]
      );
      if (result.affectedRows === 0) {
        return res.status(403).json({ success: false, error: 'Forbidden or comment not found' });
      }
      return res.json({ success: true, message: `Comment status updated to ${status}` });
    }

    // If content provided, allow admins to edit any comment, and non-admins to edit only their own
    if (typeof content === 'string') {
      if (req.user.role === 'admin') {
        const [result] = await pool.query(
          `UPDATE comments SET content = ? WHERE id = ?`,
          [content, commentId]
        );
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        return res.json({ success: true });
      } else {
        const [result] = await pool.query(
          `UPDATE comments SET content = ? WHERE id = ? AND author_id = ?`,
          [content, commentId, req.user.id]
        );
        if (result.affectedRows === 0) {
          return res.status(403).json({ success: false, error: 'Forbidden or comment not found' });
        }
        return res.json({ success: true });
      }
    }

    // Nothing to update
    return res.status(400).json({ success: false, error: 'No updatable fields provided' });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    let result;
    // Fetch the comment first so we can adjust the author's rating based on existing likes
    const [commentRows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    const commentRow = commentRows && commentRows.length ? commentRows[0] : null;
    if (req.user.role === 'admin') {
      // admins can delete any comment
      // If we have the comment row, adjust rating before deletion
      if (commentRow && commentRow.author_id) {
        try {
          const [r] = await pool.query(`SELECT COALESCE(SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END),0) as like_sum FROM likes WHERE comment_id = ?`, [commentId]);
          const likeSum = (r[0] && r[0].like_sum) ? Number(r[0].like_sum) : 0;
          if (likeSum) await pool.query(`UPDATE users SET rating = rating - ? WHERE id = ?`, [likeSum, commentRow.author_id]);
        } catch (e) { console.error('Failed to adjust user rating before comment delete', e); }
      }
      const query = `DELETE FROM comments WHERE id = ?`;
      [result] = await pool.query(query, [commentId]);
    } else {
      // regular users can only delete their own comments
      // Only allow deletion if the current user is the author. Adjust rating similarly.
      if (commentRow && commentRow.author_id && Number(commentRow.author_id) === Number(req.user.id)) {
        try {
          const [r] = await pool.query(`SELECT COALESCE(SUM(CASE WHEN type='like' THEN 1 WHEN type='dislike' THEN -1 ELSE 0 END),0) as like_sum FROM likes WHERE comment_id = ?`, [commentId]);
          const likeSum = (r[0] && r[0].like_sum) ? Number(r[0].like_sum) : 0;
          if (likeSum) await pool.query(`UPDATE users SET rating = rating - ? WHERE id = ?`, [likeSum, commentRow.author_id]);
        } catch (e) { console.error('Failed to adjust user rating before comment delete', e); }
      }
      const query = `DELETE FROM comments WHERE id = ? AND author_id = ?`;
      [result] = await pool.query(query, [commentId, req.user.id]);
    }
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden or comment not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getCommentLikes(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const query = `
      SELECT * FROM likes
      WHERE comment_id = ?
    `;
    const [likes] = await pool.query(query, [commentId]);
    res.json({ success: true, likes });
  } catch (err) {
    next(err);
  }
}

async function getComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const [comments] = await pool.query(`
      SELECT c.*, u.login as author_name, u.fullName as author_fullname
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [commentId]);
    
    if (comments.length === 0) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    
    res.json({ success: true, comment: comments[0] });
  } catch (err) {
    next(err);
  }
}

async function toggleCommentLock(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const adminId = req.user.id;
    
    const [comments] = await pool.query('SELECT locked FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    
    const newLockStatus = !comments[0].locked;
    const lockedBy = newLockStatus ? adminId : null;
    const lockedAt = newLockStatus ? new Date() : null;
    
    await pool.query(
      'UPDATE comments SET locked = ?, locked_by = ?, locked_at = ? WHERE id = ?',
      [newLockStatus, lockedBy, lockedAt, commentId]
    );
    
    res.json({ 
      success: true, 
      message: `Comment ${newLockStatus ? 'locked' : 'unlocked'} successfully`,
      locked: newLockStatus 
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCommentLike(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user.id;
    
    await pool.query(
      'DELETE FROM likes WHERE author_id = ? AND comment_id = ?',
      [userId, commentId]
    );
    
    res.json({ success: true, message: 'Like removed successfully' });
  } catch (err) {
    next(err);
  }
}

async function updateCommentStatus(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const query = req.user.role === 'admin' 
      ? 'UPDATE comments SET status = ? WHERE id = ?'
      : 'UPDATE comments SET status = ? WHERE id = ? AND author_id = ?';
    
    const params = req.user.role === 'admin' 
      ? [status, commentId]
      : [status, commentId, req.user.id];
    
    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden or comment not found' });
    }
    
    res.json({ success: true, message: `Comment status updated to ${status}` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateComment,
  deleteComment,
  getCommentLikes,
  getComment,
  toggleCommentLock,
  deleteCommentLike,
  updateCommentStatus
};
