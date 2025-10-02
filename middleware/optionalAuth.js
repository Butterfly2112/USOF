const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await userModel.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    next();
  }
}

module.exports = optionalAuth;