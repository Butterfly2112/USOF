CREATE DATABASE IF NOT EXISTS usof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE usof_db;

-- Disable foreign key checks to allow dropping tables in any order
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS post_subscriptions;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

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
  parent_id INT NULL,
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
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL,
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

-- When a post or comment is deleted, likes referencing it are typically
-- removed by FK ON DELETE CASCADE. However, at the time the likes rows
-- are deleted the parent row may already be gone, which prevents the
-- `update_user_rating_after_like_delete` trigger from finding the
-- original author and adjusting their rating. To handle this case we
-- adjust the rating before the parent (post/comment) is deleted by
-- summing existing likes and applying the inverse effect on the
-- author's rating.

CREATE TRIGGER adjust_user_rating_before_post_delete
BEFORE DELETE ON posts
FOR EACH ROW
BEGIN
  DECLARE like_sum INT DEFAULT 0;
  SELECT COALESCE(SUM(CASE WHEN type = 'like' THEN 1 WHEN type = 'dislike' THEN -1 ELSE 0 END), 0) INTO like_sum
    FROM likes WHERE post_id = OLD.id;
  -- remove the effect of all likes/dislikes for this post from author's rating
  UPDATE users SET rating = rating - like_sum WHERE id = OLD.author_id;
END//

CREATE TRIGGER adjust_user_rating_before_comment_delete
BEFORE DELETE ON comments
FOR EACH ROW
BEGIN
  DECLARE like_sum INT DEFAULT 0;
  SELECT COALESCE(SUM(CASE WHEN type = 'like' THEN 1 WHEN type = 'dislike' THEN -1 ELSE 0 END), 0) INTO like_sum
    FROM likes WHERE comment_id = OLD.id;
  -- remove the effect of all likes/dislikes for this comment from author's rating
  UPDATE users SET rating = rating - like_sum WHERE id = OLD.author_id;
END//
DELIMITER ;

-- Sample data with proper password hashing (password is "password" for both users)
INSERT INTO users (login, password, fullName, email, role, email_verified) VALUES
  ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@example.com', 'admin', TRUE),
  ('donna', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Donna Trenton', 'donna@example.com', 'user', TRUE),
  ('sam',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Samantha', 'sam@example.com', 'user', TRUE),
  ('tommy', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tommy Beresford', 'tommy@example.com', 'user', TRUE),
  ('holly', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Holly Sykes', 'holly@example.com', 'user', TRUE);

-- Seed categories for a book discussion forum
INSERT INTO categories (title, description) VALUES
  ('Fiction', 'Discussions about fiction books: novels, short stories and literary fiction'),
  ('Non-Fiction', 'Biographies, history, essays, popular science and other non-fiction works'),
  ('Fantasy', 'Fantasy novels, worldbuilding, series and authors'),
  ('Mystery & Thriller', 'Mystery, crime, detective fiction and thrillers'),
  ('Science Fiction', 'Sci‑fi novels, speculative fiction and related topics'),
  ('Classics', 'Classic literature and historical masterpieces');

-- Seed sample posts tailored to book discussions
INSERT INTO posts (author_id, title, content, status) VALUES
  (1, 'Welcome to USOF Books', 'Welcome to USOF Books - a friendly place to discuss novels, share reviews and recommend reading lists. Introduce yourself and tell us what you are reading!', 'active'),
  (2, 'Reading group: "1984" by George Orwell', 'I would like to start a thread to discuss "1984" chapter by chapter. Who wants to join?', 'active'),
  (3, 'Best contemporary novels (recommendations)', 'Share your top 5 contemporary novels from the last 20 years - looking for new reads.', 'active'),
  (4, 'Fantasy worldbuilding tips', 'What techniques help authors create believable fantasy worlds? Share examples and favorite authors.', 'active'),
  (5, 'Non-fiction recommendations: history & biography', 'Looking for approachable biographies or history books - any favorites?', 'active'),
  (1, 'Inactive example: site maintenance', 'This sample post is marked inactive and used to demonstrate post status.', 'inactive');

-- Additional seeded discussion posts requested by the site owner
INSERT INTO posts (author_id, title, content, status) VALUES
  (2, '1984 deep-dive: Winston, Julia and O''Brien - motives and choices',
   'Let''s discuss Winston Smith and Julia: are their rebellious choices purely personal survival or small acts of resistance against Big Brother? How do you read O''Brien''s role — mentor, torturer, or something else? I''ll start: Winston''s diary and his relationship with truth make him tragic to me. Share favourite passages or lines that show what you think Orwell meant.',
   'active'),
  (3, 'Cujo - terror, interpretation and sympathy for the monster',
   'Stephen King''s Cujo is terrifying on the surface, but who do we sympathize with - Donna Trenton, her son Tad, or even the dog and its owner Joe Camber? How does King make the ordinary suburban setting feel so claustrophobic? Recommended discussion: compare with other King isolated-horror pieces like "Misery" or "The Mist".',
   'active'),
  (4, 'Finding something similar - help me pick a novel',
   'I just finished a book and want something similar - it was bleak, dystopian and emotionally heavy (think Orwell / Atwood). Suggestions I''ve heard: "Brave New World" by Aldous Huxley, "Fahrenheit 451" by Ray Bradbury, or "The Handmaid''s Tale" by Margaret Atwood. What would you recommend given those reference points? Mention why you think a recommendation matches (tone, pacing, themes).',
   'active'),
  (5, 'Discuss a character''s choices - moral ambiguity and sympathy',
   'Pick any character (from any book) and let''s debate whether their choices were justified. For example, in many thrillers protagonists cross legal/ethical lines under pressure - does context excuse them? Try to point to concrete scenes when arguing for or against a character.',
   'active'),
  (2, 'Tommy & Tuppence (Agatha Christie) - charming detectives or just lucky?',
   'Agatha Christie''s early duo from "The Secret Adversary" are playful and occasionally foolish. Do Tommy and Tuppence succeed because of detective skill, sheer luck, or their relationship dynamic? Which book with the pair is your favourite and why?',
   'active'),
  (3, 'Frederik Backman - reflections on "Anxious People"',
   'Backman writes with warmth and blunt honesty about flawed people. "Anxious People" gathers a strange group of characters into one hostage situation and unfolds their backstories — what scene made you want to stand up and applaud or cry? How does Backman''s empathy shape the novel''s comedic and tragic beats?',
   'active'),
  (4, 'Mona Awad - "Bunny" blew my mind',
   'Has anyone read Mona Awad''s "Bunny"? I went in expecting surreal campus satire and came out bewildered - the way Sam (Samantha) experiences the "Bunnies" and their rituals was at once funny and horrific. What interpretations do you have for the ending? Which passages stuck with you?',
   'active');

INSERT INTO post_categories (post_id, category_id) VALUES
  (1, 1), -- Welcome -> Fiction (general)
  (2, 5), -- 1984 discussion -> Science Fiction
  (3, 1), -- contemporary novels -> Fiction
  (4, 3), -- worldbuilding -> Fantasy
  (5, 2), -- non-fiction recommendations -> Non-Fiction
  (6, 1);

INSERT INTO comments (author_id, post_id, content) VALUES
  (2, 1, 'Hello everyone - I''m excited to be here. Currently reading a historical novel.'),
  (1, 2, 'I''m in for the "1984" reading group - week 1 discussion starts Monday.'),
  (3, 3, 'I recommend "The Overstory" and "A Little Life" if you like contemporary literary fiction.'),
  (4, 4, 'I like to start with clear rules for magic systems to keep the world consistent.'),
  (5, 5, 'Try Walter Isaacson or Simon Winchester for accessible history/biography.'),
  (2, 6, 'Thanks for the heads up about maintenance.');

INSERT INTO likes (author_id, post_id, type) VALUES
  (2, 1, 'like'),
  (1, 2, 'like'),
  (3, 3, 'like'),
  (4, 4, 'like'),
  (5, 5, 'like'),
  (1, 3, 'like'),
  (2, 4, 'dislike');
