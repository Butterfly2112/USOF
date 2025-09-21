-- seeders/init.sql
CREATE DATABASE IF NOT EXISTS usof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE usof_db;

-- users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  profilePicture VARCHAR(255),
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rating INT DEFAULT 0
);

-- password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- posts
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- post_categories (many-to-many)
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  post_id INT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- likes (polymorphic: post_id or comment_id)
CREATE TABLE IF NOT EXISTS likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  post_id INT NULL,
  comment_id INT NULL,
  type ENUM('like','dislike') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX idx_author_id ON posts (author_id);
CREATE INDEX idx_post_id ON comments (post_id);
CREATE INDEX idx_comment_id ON likes (comment_id);

-- sample data
INSERT IGNORE INTO users (login, password, fullName, email, role) VALUES
  ('admin', '$2b$10$w6Pj...replace_with_real_hash', 'Administrator', 'admin@example.com', 'admin'),
  ('user1', '$2b$10$examplehash1', 'User One', 'user1@example.com', 'user'),
  ('user2', '$2b$10$examplehash2', 'User Two', 'user2@example.com', 'user'),
  ('user3', '$2b$10$examplehash3', 'User Three', 'user3@example.com', 'user'),
  ('admin2', '$2b$10$examplehash4', 'Admin Two', 'admin2@example.com', 'admin');

-- create example categories
INSERT IGNORE INTO categories (title, description) VALUES
  ('General', 'General topics'),
  ('News', 'News and updates'),
  ('Programming', 'Code and development'),
  ('Technology', 'Tech-related topics'),
  ('Lifestyle', 'Lifestyle and hobbies'),
  ('Education', 'Learning and teaching');

-- sample posts (without attachments)
INSERT INTO posts (author_id, title, content, status) VALUES
  (1, 'Welcome to USOF', 'This is the first post', 'active'),
  (2, 'Second Post', 'This is the second post by user1', 'active'),
  (3, 'Third Post', 'This is the third post by user2', 'inactive'),
  (4, 'Admin Post', 'This is a post by admin2', 'active');

INSERT INTO post_categories (post_id, category_id) VALUES
  (1, 1),
  (2, 2),
  (3, 3),
  (4, 1),
  (4, 2);

INSERT INTO comments (author_id, post_id, content) VALUES
  (2, 1, 'This is a comment by user1 on the first post'),
  (3, 1, 'This is another comment by user2 on the first post'),
  (4, 2, 'Admin2 commenting on the second post');

INSERT INTO likes (author_id, post_id, type) VALUES
  (2, 1, 'like'),
  (3, 1, 'dislike'),
  (4, 2, 'like');

INSERT INTO likes (author_id, comment_id, type) VALUES
  (2, 1, 'like'),
  (3, 2, 'like'),
  (4, 3, 'dislike');

-- triggers
DELIMITER $$

CREATE TRIGGER update_user_rating
AFTER INSERT ON likes
FOR EACH ROW
BEGIN
  UPDATE users
  SET rating = (
    SELECT COALESCE(SUM(CASE WHEN type = 'like' THEN 1 ELSE -1 END), 0)
    FROM likes
    WHERE author_id = NEW.author_id
  )
  WHERE id = NEW.author_id;
END$$

DELIMITER ;
