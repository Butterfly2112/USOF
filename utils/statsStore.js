const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'stats.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ homeViews: 0, totalPostViews: 0, posts: {} }, null, 2));
}

function read() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}'); } catch (e) { return { homeViews:0, totalPostViews:0, posts: {} }; }
}

function write(obj) { ensure(); fs.writeFileSync(FILE, JSON.stringify(obj, null, 2)); }

function incrementHome() {
  const d = read();
  d.homeViews = (d.homeViews || 0) + 1;
  write(d);
}

function incrementPost(postId) {
  const d = read();
  d.totalPostViews = (d.totalPostViews || 0) + 1;
  d.posts = d.posts || {};
  d.posts[postId] = (d.posts[postId] || 0) + 1;
  write(d);
}

function getStats() { return read(); }

module.exports = { incrementHome, incrementPost, getStats };
