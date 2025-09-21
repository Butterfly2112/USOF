const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');

const pool = require('./config/database');

const { errorHandler } = require('./middleware/errorMiddleware');

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/' + UPLOAD_DIR, express.static(path.join(__dirname, UPLOAD_DIR)));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/search', require('./routes/search'));
app.use('/api/stats', require('./routes/stats'));

// Health check endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function init() {
  // Optionally ensure tables exist (run migration SQL if not using separate migration)
  // For now assume user ran seeders/init.sql
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

init().catch(err => {
  console.error('Failed to init server', err);
  process.exit(1);
});
