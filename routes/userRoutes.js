const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { pool } = require('../db/db');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, login, email, role FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
