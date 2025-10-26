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
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { login, password, fullName, email } = req.body;
    
    const exists = await userModel.findByLoginOrEmail(login) || await userModel.findByLoginOrEmail(email);
    if (exists) return res.status(400).json({ success: false, error: 'Login or email already used' });

    const user = await userModel.createUser({ login, password, fullName, email });
    // Fetch created user and issue JWT so the user is automatically logged in after registration
    const created = await userModel.findById(user.id);
    const token = jwt.sign({ id: created.id, role: created.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    // Return token and user shape compatible with login response
    res.json({ success: true, token, user: { id: created.id, login: created.login, email: created.email, role: created.role } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { loginOrEmail, password } = req.body;
    
    const userRow = await userModel.findByLoginOrEmail(loginOrEmail);
    if (!userRow) return res.status(400).json({ success: false, error: 'Invalid credentials' });

    const ok = await userModel.verifyPassword(userRow, password);
    if (!ok) return res.status(400).json({ success: false, error: 'Invalid credentials' });

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

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Build reset link. By default the app preferred the frontend URL so users land on the client UI.
    // If you want emails to contain the backend/API link (for example http://localhost:4000/reset-password?token=...)
    // set RESET_LINK_HOST=backend (or RESET_LINK_HOST=server) in .env. This keeps behavior configurable.
    const preferBackend = (process.env.RESET_LINK_HOST === 'backend' || process.env.RESET_LINK_HOST === 'server' || process.env.RESET_LINK_PREFER === 'backend');

    let resetLink;
    if (preferBackend) {
      // Use BASE_URL (or fallback to localhost:PORT) and generate a backend URL that will redirect to frontend
      const backendHost = (process.env.BASE_URL && process.env.BASE_URL.trim()) ? process.env.BASE_URL : `http://localhost:${process.env.PORT || 4000}`;
      resetLink = `${backendHost.replace(/\/$/, '')}/reset-password?token=${token}`;
    } else {
      // Prefer frontend URL so users land on the client UI directly
      const frontend = process.env.FRONTEND_URL || process.env.BASE_URL || '';
      resetLink = frontend ? `${frontend.replace(/\/$/, '')}/reset-password?token=${token}` : `${process.env.BASE_URL}/api/auth/reset-password?token=${token}`;
    }

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
    
    const record = await userModel.findByResetToken(token);
    if (!record) return res.status(400).json({ success: false, error: 'Invalid token' });

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, record.user_id]);
    
    await pool.query(`DELETE FROM password_resets WHERE id = ?`, [record.id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Redirect GET requests (from old email links) to the frontend reset page
async function resetPasswordRedirect(req, res, next) {
  try {
    const token = req.query.token || req.body.token;
    const frontend = process.env.FRONTEND_URL || process.env.BASE_URL || '';
    if (!frontend) return res.status(400).send('Frontend URL not configured');
    const target = `${frontend.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token || '')}`;
    // 302 redirect to client reset page
    return res.redirect(target);
  } catch (err) {
    next(err);
  }
}

async function confirmPasswordReset(req, res, next) {
  try {
    const { confirm_token } = req.params;
    const { newPassword } = req.body;
    
    const record = await userModel.findByResetToken(confirm_token);
    if (!record) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, record.user_id]);
    
    await pool.query(`DELETE FROM password_resets WHERE id = ?`, [record.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
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
  logout,
  resetPasswordRedirect
};
