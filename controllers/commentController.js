const commentModel = require('../models/comment');
const pool = require('../config/database');

async function updateComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const { content } = req.body;
    // Only allow users to update their own comments
    const query = `
      UPDATE comments
      SET content = ?
      WHERE id = ? AND author_id = ?
    `;
    const [result] = await pool.query(query, [content, commentId, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden or comment not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    // Only allow users to delete their own comments
    const query = `
      DELETE FROM comments
      WHERE id = ? AND author_id = ?
    `;
    const [result] = await pool.query(query, [commentId, req.user.id]);
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
    // Join with users table to get author information
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
    
    // Get current lock status
    const [comments] = await pool.query('SELECT locked FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    
    // Toggle lock status
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
    
    // Validate status value
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    // Users can only change their own comments, admins can change any
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
