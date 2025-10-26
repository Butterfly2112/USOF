-- Migration: ensure user.rating is adjusted when posts/comments with likes are deleted
-- This creates BEFORE DELETE triggers on posts and comments that subtract the
-- net like/dislike sum from the author's rating before the likes are removed
-- by ON DELETE CASCADE.

DROP TRIGGER IF EXISTS adjust_user_rating_before_post_delete;
DROP TRIGGER IF EXISTS adjust_user_rating_before_comment_delete;

DELIMITER //

CREATE TRIGGER adjust_user_rating_before_post_delete
BEFORE DELETE ON posts
FOR EACH ROW
BEGIN
  DECLARE like_sum INT DEFAULT 0;
  SELECT COALESCE(SUM(CASE WHEN type = 'like' THEN 1 WHEN type = 'dislike' THEN -1 ELSE 0 END), 0) INTO like_sum
    FROM likes WHERE post_id = OLD.id;
  UPDATE users SET rating = rating - like_sum WHERE id = OLD.author_id;
END//

CREATE TRIGGER adjust_user_rating_before_comment_delete
BEFORE DELETE ON comments
FOR EACH ROW
BEGIN
  DECLARE like_sum INT DEFAULT 0;
  SELECT COALESCE(SUM(CASE WHEN type = 'like' THEN 1 WHEN type = 'dislike' THEN -1 ELSE 0 END), 0) INTO like_sum
    FROM likes WHERE comment_id = OLD.id;
  UPDATE users SET rating = rating - like_sum WHERE id = OLD.author_id;
END//

DELIMITER ;
