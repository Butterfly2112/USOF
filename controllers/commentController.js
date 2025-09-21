const commentModel = require('../models/comment');
const pool = require('../config/database');

async function updateComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const { content } = req.body;
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

module.exports = {
  updateComment,
  deleteComment,
  getCommentLikes // Экспортируем новую функцию
};
