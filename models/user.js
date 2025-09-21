const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const saltRounds = 10;

async function createUser({ login, password, fullName, email, profilePicture, role='user' }) {
  // Hash password before storing in database
  const hash = await bcrypt.hash(password, saltRounds);
  const [result] = await pool.query(
    `INSERT INTO users (login, password, fullName, email, profilePicture, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [login, hash, fullName, email, profilePicture || null, role]
  );
  return { id: result.insertId };
}

async function findByLoginOrEmail(loginOrEmail) {
  // Find user by either login or email
  const [rows] = await pool.query(`SELECT * FROM users WHERE login = ? OR email = ? LIMIT 1`, [loginOrEmail, loginOrEmail]);
  return rows[0];
}

async function findById(id) {
  // Return user data without password for security
  const [rows] = await pool.query(`SELECT id, login, fullName, email, profilePicture, role FROM users WHERE id = ?`, [id]);
  return rows[0];
}

async function updateUser(id, fields = {}) {
  // Build dynamic UPDATE query from fields object
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
  // Generate unique token with 1 hour expiry
  const token = uuidv4();
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour
  await pool.query(`INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)`, [userId, token, new Date(expires)]);
  return token;
}

async function findByResetToken(token) {
  // Find valid (non-expired) password reset token
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
