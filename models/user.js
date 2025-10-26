const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const saltRounds = 10;

async function createUser({ login, password, fullName, email, profilePicture, role='user' }) {
  const hash = await bcrypt.hash(password, saltRounds);
  const [result] = await pool.query(
    `INSERT INTO users (login, password, fullName, email, profilePicture, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [login, hash, fullName, email, profilePicture || null, role]
  );
  return { id: result.insertId };
}

async function findByLoginOrEmail(loginOrEmail) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE login = ? OR email = ? LIMIT 1`, [loginOrEmail, loginOrEmail]);
  return rows[0];
}

async function findById(id) {
  // Calculate rating on the fly as the net sum of likes minus dislikes
  // across all posts and comments authored by the user.
  const [rows] = await pool.query(`
    SELECT u.id, u.login, u.fullName, u.email, u.profilePicture, u.role,
      COALESCE(p.likes_sum, 0) + COALESCE(c.likes_sum, 0) AS rating
    FROM users u
    LEFT JOIN (
      SELECT p.author_id AS user_id,
        SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END) AS likes_sum
      FROM posts p
      JOIN likes l ON l.post_id = p.id
      GROUP BY p.author_id
    ) p ON p.user_id = u.id
    LEFT JOIN (
      SELECT c.author_id AS user_id,
        SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END) AS likes_sum
      FROM comments c
      JOIN likes l ON l.comment_id = c.id
      GROUP BY c.author_id
    ) c ON c.user_id = u.id
    WHERE u.id = ?
  `, [id]);

  return rows[0];
}

async function updateUser(id, fields = {}) {
  const cols = [], vals = [];
  for (const [k, v] of Object.entries(fields)) {
    cols.push(`${k} = ?`);
    vals.push(v);
  }
  if (cols.length === 0) return;
  vals.push(id);
  await pool.query(`UPDATE users SET ${cols.join(', ')} WHERE id = ?`, vals);
}

async function deleteUser(id) {
  await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
}

async function verifyPassword(userRow, password) {
  return bcrypt.compare(password, userRow.password);
}

async function setPasswordResetToken(userId) {
  const token = uuidv4();
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour
  await pool.query(`INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)`, [userId, token, new Date(expires)]);
  return token;
}

async function findByResetToken(token) {
  const [rows] = await pool.query(`SELECT pr.*, u.email, u.id as user_id FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE pr.token = ? AND pr.expires_at > NOW() LIMIT 1`, [token]);
  return rows[0];
}

module.exports = {
  createUser,
  findByLoginOrEmail,
  findById,
  updateUser,
  deleteUser,
  verifyPassword,
  setPasswordResetToken,
  findByResetToken
};
