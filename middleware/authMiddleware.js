const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = { id: user.id, role: user.role, login: user.login };
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
