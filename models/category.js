// models/category.js
const pool = require('../config/database');

async function createCategory({ title, description }) {
  const [res] = await pool.query(`INSERT INTO categories (title, description) VALUES (?, ?)`, [title, description]);
  return res.insertId;
}

async function getCategoryById(id) {
  const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ?`, [id]);
  return rows[0];
}

async function updateCategory(id, fields) {
  const cols = [], vals=[];
  for (const [k,v] of Object.entries(fields)) { cols.push(`${k} = ?`); vals.push(v); }
  vals.push(id);
  await pool.query(`UPDATE categories SET ${cols.join(', ')} WHERE id = ?`, vals);
}

async function deleteCategory(id) {
  await pool.query(`DELETE FROM categories WHERE id = ?`, [id]);
}

async function listCategories() {
  const [rows] = await pool.query(`SELECT * FROM categories ORDER BY title`);
  return rows;
}

module.exports = { createCategory, getCategoryById, updateCategory, deleteCategory, listCategories };
