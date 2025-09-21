module.exports = function adminMiddleware(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
  next();
};
