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
    if (req.user.role !== 'admin' && req.user.id !== targetId) return res.status(403).json({ success: false, error: 'Forbidden' });
    await userModel.deleteUser(targetId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
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
