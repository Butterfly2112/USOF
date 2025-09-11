
-- ========================
-- Пользователи
-- ========================
INSERT INTO users (login, password, full_name, email, role) VALUES
('admin_user', '$2b$10$N9qo8uLOickgx2ZMRZo5i.uO0Gd/TkzTP/Kj4nVxkOV9mQF0Sgk1a', 'Admin One', 'admin@example.com', 'admin'),
('john_doe', '$2b$10$7Qf6l2x8gkHz6yF1qCwV1Oa8R0i9N9Kj6NQ6YmfiCw7MZ5ZQbGf6O', 'John Doe', 'john@example.com', 'user'),
('jane_smith', '$2b$10$T3r8kL9fN3vO6qZ5C0rT8.5PdK8h1lQ7fR9H3v6N8kQ1P3R6B9G7W', 'Jane Smith', 'jane@example.com', 'user'),
('alice_jones', '$2b$10$F6y1K2vG9oP4tM8bN1hZ2uO7cJ5qL0dR3nB9fQ1kE4sH6jL0YwZ6', 'Alice Jones', 'alice@example.com', 'user'),
('bob_brown', '$2b$10$K7t5P8rD2gL9vQ3nH6fT4jS0cX2oM5yR1bN9dE7hJ4kZ6pF3U1W', 'Bob Brown', 'bob@example.com', 'user');

-- ========================
-- Категории
-- ========================
INSERT INTO categories (title, description) VALUES
('Technology', 'All about tech, gadgets, and software.'),
('Science', 'Scientific discoveries and research news.'),
('Travel', 'Travel tips, destinations, and experiences.'),
('Food', 'Recipes, restaurants, and food reviews.'),
('Lifestyle', 'Health, fashion, and lifestyle advice.');

-- ========================
-- Посты
-- ========================
INSERT INTO posts (author_id, title, content, status) VALUES
(1, 'Welcome to USOF', 'This is the first post on our platform!', 'active'),
(2, 'Top 10 Programming Languages in 2025', 'A detailed guide on the most popular programming languages.', 'active'),
(3, 'My Trip to Japan', 'Sharing my travel experiences in Japan.', 'active'),
(4, 'Healthy Recipes', 'Easy and healthy recipes for everyday meals.', 'active'),
(5, 'Meditation Tips', 'How to meditate effectively for stress relief.', 'active');

-- ========================
-- Связь постов с категориями
-- ========================
INSERT INTO post_categories (post_id, category_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3),
(4, 4),
(5, 5),
(2, 5);

-- ========================
-- Комментарии
-- ========================
INSERT INTO comments (author_id, post_id, content, status) VALUES
(2, 1, 'Great to see this platform live!', 'active'),
(3, 2, 'Very informative article.', 'active'),
(4, 3, 'Japan looks amazing!', 'active'),
(5, 4, 'Thanks for the healthy recipes!', 'active'),
(1, 5, 'Meditation really helps me too!', 'active');

-- ========================
-- Лайки/дизлайки
-- ========================
INSERT INTO likes (author_id, entity_id, entity_type, type) VALUES
(2, 1, 'post', 'like'),
(3, 2, 'post', 'like'),
(4, 3, 'post', 'like'),
(5, 4, 'post', 'like'),
(1, 5, 'post', 'like'),
(2, 1, 'comment', 'like'),
(3, 2, 'comment', 'like');
