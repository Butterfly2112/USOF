const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    const payload = jwt.verify(token, JWT_SECRET);
    // fetch user basic info
    const [rows] = await pool.query('SELECT id, login, email, fullName, role, profilePicture FROM users WHERE id = ?', [payload.id]);
    if (!rows[0]) return res.status(401).json({ success: false, error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
