CREATE DATABASE IF NOT EXISTS usof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE usof_db;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS post_subscriptions;
DROP TABLE IF EXISTS notifications;

-- users table (all required fields included)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  profilePicture VARCHAR(255) DEFAULT NULL,
  rating INT DEFAULT 0,
  role ENUM('user','admin','guest') DEFAULT 'user',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- password reset tokens
CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- categories table (title and description as required)
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- posts table (all required fields)
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT FALSE,
  locked_by INT NULL,
  locked_at TIMESTAMP NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

-- post_categories (many-to-many relationship)
CREATE TABLE post_categories (
  post_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- comments table (author, publish_date, content as required)
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  post_id INT NOT NULL,
  content TEXT NOT NULL,
  publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT FALSE,
  locked_by INT NULL,
  locked_at TIMESTAMP NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

-- likes table (author, publish_date, post/comment_id, type as required)
CREATE TABLE likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  post_id INT NULL,
  comment_id INT NULL,
  type ENUM('like', 'dislike') NOT NULL,
  publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (author_id, post_id, comment_id),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- user_favorites table (user_id, post_id as required)
CREATE TABLE user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, post_id)
);

-- post_subscriptions table (user_id, post_id as required)
CREATE TABLE post_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_subscription (user_id, post_id)
);

-- notifications table (user_id, type, post_id, triggered_by_user_id as required)
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('post_updated', 'new_comment', 'post_liked') NOT NULL,
  post_id INT NOT NULL,
  triggered_by_user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger to update user rating automatically
DELIMITER //
CREATE TRIGGER update_user_rating_after_like_insert
AFTER INSERT ON likes
FOR EACH ROW
BEGIN
  DECLARE target_user_id INT;
  DECLARE like_value INT;
  
  SET like_value = CASE WHEN NEW.type = 'like' THEN 1 ELSE -1 END;
  
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO target_user_id FROM posts WHERE id = NEW.post_id;
  ELSE
    SELECT author_id INTO target_user_id FROM comments WHERE id = NEW.comment_id;
  END IF;
  
  UPDATE users SET rating = rating + like_value WHERE id = target_user_id;
END//

CREATE TRIGGER update_user_rating_after_like_delete
AFTER DELETE ON likes
FOR EACH ROW
BEGIN
  DECLARE target_user_id INT;
  DECLARE like_value INT;
  
  SET like_value = CASE WHEN OLD.type = 'like' THEN -1 ELSE 1 END;
  
  IF OLD.post_id IS NOT NULL THEN
    SELECT author_id INTO target_user_id FROM posts WHERE id = OLD.post_id;
  ELSE
    SELECT author_id INTO target_user_id FROM comments WHERE id = OLD.comment_id;
  END IF;
  
  UPDATE users SET rating = rating + like_value WHERE id = target_user_id;
END//
DELIMITER ;

-- Sample data with proper password hashing (you should hash these properly in your app)
INSERT INTO users (login, password, fullName, email, role, email_verified) VALUES
  ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@example.com', 'admin', TRUE),
  ('user1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'user1@example.com', 'user', TRUE);

INSERT INTO categories (title, description) VALUES
  ('General', 'General discussion topics and questions'),
  ('Technology', 'Technology, programming and IT related discussions'),
  ('Science', 'Scientific topics and research discussions');

INSERT INTO posts (author_id, title, content, status) VALUES
  (1, 'Welcome to USOF Platform', 'This is the first post on our question-answer platform. Feel free to ask questions and share knowledge!', 'active'),
  (2, 'How to get started with programming?', 'I am new to programming and would like to know the best way to start learning. Any recommendations?', 'active');

INSERT INTO post_categories (post_id, category_id) VALUES
  (1, 1),
  (2, 2);

INSERT INTO comments (author_id, post_id, content) VALUES
  (2, 1, 'Great platform! Looking forward to participating.'),
  (1, 2, 'Welcome to the community! I recommend starting with Python or JavaScript.');

INSERT INTO likes (author_id, post_id, type) VALUES
  (2, 1, 'like'),
  (1, 2, 'like');
