const pool = require('../config/database');
const { validationResult } = require('express-validator');

async function createCategory(req, res, next) {
  try {
    const { title, description } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Title is required' });
    // Prevent duplicate titles
    const [existing] = await pool.query('SELECT id FROM categories WHERE title = ?', [title.trim()]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Category with this title already exists' });
    }
    const [result] = await pool.query('INSERT INTO categories (title, description) VALUES (?, ?)', [title.trim(), description || '']);
    res.json({ success: true, categoryId: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    const [categories] = await pool.query('SELECT * FROM categories');
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

async function getCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.categoryId);
    const [categories] = await pool.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    // Check if category exists
    if (!categories.length) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, category: categories[0] });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.categoryId);
    const { title, description } = req.body;
    await pool.query('UPDATE categories SET title = ?, description = ? WHERE id = ?', [title, description, categoryId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.categoryId);
    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getPostsByCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.categoryId);
    // Join posts with categories through many-to-many relationship
    const query = `
      SELECT p.* FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      WHERE pc.category_id = ?
    `;
    const [posts] = await pool.query(query, [categoryId]);
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getPostsByCategory
};
