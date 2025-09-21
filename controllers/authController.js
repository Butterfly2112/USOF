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
    res.json({ success: true, user });
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

    const token = await userModel.setPasswordResetToken(userRow.id);

    // send email (basic)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

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
    const record = await userModel.findByResetToken(token);
    if (!record) return res.status(400).json({ success: false, error: 'Invalid token' });

    // update password
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, record.user_id]);
    // delete token
    await pool.query(`DELETE FROM password_resets WHERE id = ?`, [record.id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // Пример реализации выхода из системы
    // Если вы используете токены, просто "аннулируйте" их на клиенте
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
  logout // Экспортируем новую функцию
};
