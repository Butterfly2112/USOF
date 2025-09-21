// routes/posts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const pc = require('../controllers/postController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads'); // Папка для сохранения
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname); // Получаем расширение файла
    cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Генерируем имя файла
  }
});

const upload = multer({ storage });

// Список постов с фильтрацией и сортировкой
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, sort = 'likes', categories, dateFrom, dateTo, status = 'active' } = req.query;

    const filters = {
      page: Number(page),
      pageSize: Number(pageSize),
      sort,
      categories: categories ? categories.split(',') : [],
      dateFrom,
      dateTo,
      status
    };

    const posts = await pc.listPosts(filters);
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
});

// Создание поста
router.post('/', auth, upload.array('images', 6), async (req, res, next) => {
  try {
    if (req.files && req.files.length) {
      req.body.images = req.files.map(f => '/' + path.join(process.env.UPLOAD_DIR || 'uploads', f.filename));
    }
    await pc.createPost(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Получение поста по ID (ДОЛЖНО БЫТЬ ПУБЛИЧНЫМ)
router.get('/:postId', pc.getPost); // убрать auth

// Обновление поста
router.patch('/:postId', auth, pc.updatePost);

// Удаление поста
router.delete('/:postId', auth, pc.deletePost);

// Получение всех комментариев для поста
router.get('/:postId/comments', pc.listComments);

// Добавление комментария к посту
router.post('/:postId/comments', auth, pc.addComment);

// Получение всех лайков под постом (УБРАТЬ 's')
router.get('/:postId/like', async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const likes = await pc.getPostLikes(postId);
    res.json({ success: true, likes });
  } catch (err) {
    next(err);
  }
});

// Добавление лайка к посту (УБРАТЬ 's')
router.post('/:postId/like', auth, pc.like);

// Удаление лайка поста (УБРАТЬ 's')
router.delete('/:postId/like', auth, pc.deleteLike);

// ОТСУТСТВУЕТ: GET /api/posts/:post_id/categories
router.get('/:postId/categories', pc.getPostCategories);

// Блокировка/разблокировка поста (только для админов)
router.patch('/:postId/lock', auth, admin, pc.togglePostLock);

module.exports = router;
