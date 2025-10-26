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
    const targetId = Number(req.params.userId);
    if (req.user.role !== 'admin' && req.user.id !== targetId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const fields = {};
    const allowed = ['login', 'fullName', 'email', 'profilePicture', 'role'];
    for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];

    // Only admins may change the 'role' field. If a non-admin user attempts to set 'role', reject.
    if (fields.role !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can change user roles' });
    }

    // If login is being changed, ensure it is unique
    if (fields.login) {
      const existing = await userModel.findByLoginOrEmail(fields.login);
      if (existing && existing.id !== targetId) {
        return res.status(400).json({ success: false, error: 'Login already exists' });
      }
    }

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
    if (req.user.role !== 'admin' && req.user.id !== targetId) return res.status(403).json({ success: false, error: 'Forbidden' });
    await userModel.deleteUser(targetId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    // Support query parameters: q (search), sort ('rating'|'new'), role (user|admin), page, pageSize
    const { q, sort = 'rating', role, page = 1, pageSize = 20 } = req.query;
    const where = [];
    const vals = [];
    if (q && String(q).trim().length) {
      where.push('(login LIKE ? OR fullName LIKE ?)');
      const like = `%${String(q).trim()}%`;
      vals.push(like, like);
    }
    if (role && (role === 'admin' || role === 'user')) {
      where.push('role = ?');
      vals.push(role);
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // Sorting
    let orderSql = 'rating DESC, id DESC';
    if (sort === 'new' || sort === 'created') orderSql = 'created_at DESC, id DESC';
    else if (sort === 'rating') orderSql = 'rating DESC, id DESC';

    const offset = (Number(page) - 1) * Number(pageSize);

    const sql = `SELECT id, login, fullName, profilePicture, rating, role, created_at FROM users ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`;
    const valsForQuery = vals.concat([Number(pageSize), Number(offset)]);
    const [rows] = await pool.query(sql, valsForQuery);

    // total count
    const countSql = `SELECT COUNT(*) as total FROM users ${whereSql}`;
    const [countRows] = await pool.query(countSql, vals);
    const total = (countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

    res.json({ success: true, users: rows, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { login, password, passwordConfirmation, email, fullName, role = 'user' } = req.body;
    
    if (password !== passwordConfirmation) {
      return res.status(400).json({ success: false, error: 'Password confirmation does not match' });
    }

    const existingUser = await userModel.findByLoginOrEmail(login) || await userModel.findByLoginOrEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Login or email already exists' });
    }

    const user = await userModel.createUser({ 
      login, 
      password, 
      fullName, 
      email, 
      role 
    });
    
    const createdUser = await userModel.findById(user.id);
    res.status(201).json({ success: true, user: createdUser });
  } catch (err) {
    console.error('Create user error:', err);
    next(err);
  }
}

async function updateAvatar(req, res, next) {
  try {
    const userId = req.user.id;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ success: false, error: 'No profile picture provided' });
    }
    
    const query = `
      UPDATE users
      SET profilePicture = ?
      WHERE id = ?
    `;
    await pool.query(query, [profilePicture, userId]);
    
    res.json({ 
      success: true, 
      message: 'Avatar updated successfully',
      profilePicture: profilePicture
    });
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
