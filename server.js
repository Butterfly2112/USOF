const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');

const pool = require('./config/database');

const { errorHandler } = require('./middleware/errorMiddleware');

// Uploads directory (store uploads inside project by default)
const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || 'uploads';
const UPLOAD_DIR = path.join(__dirname, UPLOAD_DIR_NAME);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use('/' + UPLOAD_DIR_NAME, express.static(UPLOAD_DIR));

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

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function init() {
  // If a client build exists, serve it (production-friendly)
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    // Fallback to index.html for SPA routes (must come after API routes)
    // Use a middleware instead of app.get with a pattern to avoid path-to-regexp parsing issues
    app.use((req, res, next) => {
      const url = req.url || '';
      // Skip API and uploads paths and requests for static files (having an extension)
      if (url.startsWith('/api') || url.startsWith('/' + UPLOAD_DIR_NAME) || path.extname(url)) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

init().catch(err => {
  console.error('Failed to init server', err);
  process.exit(1);
});
