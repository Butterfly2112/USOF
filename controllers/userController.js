const userModel = require('../models/user');
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

async function getProfile(req, res, next) {
  try {
    const id = req.params.userId;
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    // Only admin or profile owner can update
    const targetId = Number(req.params.userId);
    if (req.user.role !== 'admin' && req.user.id !== targetId) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Filter only allowed fields for update
    const fields = {};
    const allowed = ['fullName', 'email', 'profilePicture', 'role'];
    for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];

    if (Object.keys(fields).length === 0) return res.json({ success: true, message: 'Nothing to update' });
    await userModel.updateUser(targetId, fields);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const targetId = Number(req.params.userId);
    // Only admin or profile owner can delete
    if (req.user.role !== 'admin' && req.user.id !== targetId) return res.status(403).json({ success: false, error: 'Forbidden' });
    await userModel.deleteUser(targetId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    // Public user list - hide sensitive data
    const [rows] = await pool.query(`
      SELECT id, login, fullName, profilePicture, rating, role, created_at 
      FROM users 
      ORDER BY rating DESC, id DESC
    `);
    res.json({ success: true, users: rows });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { login, password, email, role = 'user' } = req.body;
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (login, password, email, role)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [login, hashedPassword, email, role]);
    res.json({ success: true, userId: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateAvatar(req, res, next) {
  try {
    // Users can only update their own avatar
    const userId = req.user.id;
    const { profilePicture } = req.body;
    const query = `
      UPDATE users
      SET profilePicture = ?
      WHERE id = ?
    `;
    await pool.query(query, [profilePicture, userId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  deleteUser,
  listUsers,
  createUser,
  updateAvatar
};
