const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { validationResult } = require('express-validator');
const userModel = require('../models/user');
const nodemailer = require('nodemailer');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res, next) {
  try {
    // Validate input data
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { login, password, fullName, email } = req.body;
    
    // Check if user already exists
    const exists = await userModel.findByLoginOrEmail(login) || await userModel.findByLoginOrEmail(email);
    if (exists) return res.status(400).json({ success: false, error: 'Login or email already used' });

    const user = await userModel.createUser({ login, password, fullName, email });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { loginOrEmail, password } = req.body;
    
    // Find user by login or email
    const userRow = await userModel.findByLoginOrEmail(loginOrEmail);
    if (!userRow) return res.status(400).json({ success: false, error: 'Invalid credentials' });

    // Verify password
    const ok = await userModel.verifyPassword(userRow, password);
    if (!ok) return res.status(400).json({ success: false, error: 'Invalid credentials' });

    // Generate JWT token
    const token = jwt.sign({ id: userRow.id, role: userRow.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ success: true, token, user: { id: userRow.id, login: userRow.login, email: userRow.email, role: userRow.role } });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const userRow = await userModel.findByLoginOrEmail(email);
    if (!userRow) return res.status(400).json({ success: false, error: 'No such user' });

    // Generate password reset token
    const token = await userModel.setPasswordResetToken(userRow.id);

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send password reset email
    const resetLink = `${process.env.BASE_URL}/api/auth/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userRow.email,
      subject: 'Password reset',
      text: `Reset link: ${resetLink}`,
      html: `<p>Reset link: <a href="${resetLink}">${resetLink}</a></p>`
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    
    // Verify reset token
    const record = await userModel.findByResetToken(token);
    if (!record) return res.status(400).json({ success: false, error: 'Invalid token' });

    // Hash new password and update in database
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, record.user_id]);
    
    // Remove used token
    await pool.query(`DELETE FROM password_resets WHERE id = ?`, [record.id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function confirmPasswordReset(req, res, next) {
  try {
    const { confirm_token } = req.params;
    const { newPassword } = req.body;
    
    // Verify token from URL parameter
    const record = await userModel.findByResetToken(confirm_token);
    if (!record) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    // Update password with new hash
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, record.user_id]);
    
    // Clean up used token
    await pool.query(`DELETE FROM password_resets WHERE id = ?`, [record.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // Simple logout - client should remove token
    // For JWT tokens, logout is handled client-side by removing the token
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  confirmPasswordReset,
  logout
};
