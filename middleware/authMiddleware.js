const { verifyToken } = require('../utils/auth');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = user; // Добавляем информацию о пользователе в объект запроса
    next();
}

function authorizeRoles(roles = []) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied: User role not found' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied: Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRoles
};