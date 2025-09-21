const pool = require('../config/database');

async function subscribeToPost(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    
    // Use INSERT IGNORE to prevent duplicate subscriptions
    await pool.query(
      'INSERT IGNORE INTO post_subscriptions (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
    
    res.json({ success: true, message: 'Subscribed to post' });
  } catch (err) {
    next(err);
  }
}

async function unsubscribeFromPost(req, res, next) {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    
    await pool.query(
      'DELETE FROM post_subscriptions WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    res.json({ success: true, message: 'Unsubscribed from post' });
  } catch (err) {
    next(err);
  }
}

async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * pageSize;
    
    // Join notifications with posts and users to get additional info
    let query = `
      SELECT n.*, p.title as post_title, u.login as triggered_by_login
      FROM notifications n
      JOIN posts p ON n.post_id = p.id
      JOIN users u ON n.triggered_by_user_id = u.id
      WHERE n.user_id = ?
    `;
    
    const params = [userId];
    
    // Optionally filter only unread notifications
    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [notifications] = await pool.query(query, params);
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = Number(req.params.notificationId);
    
    // Ensure user can only mark their own notifications as read
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

// Helper function to create notifications for subscribers
async function createNotification(type, postId, triggeredByUserId, message) {
  try {
    // Get all subscribers except the user who triggered the action
    const [subscribers] = await pool.query(
      'SELECT user_id FROM post_subscriptions WHERE post_id = ? AND user_id != ?',
      [postId, triggeredByUserId]
    );
    
    // Create notification for each subscriber
    for (const subscriber of subscribers) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, post_id, triggered_by_user_id, message) VALUES (?, ?, ?, ?, ?)',
        [subscriber.user_id, type, postId, triggeredByUserId, message]
      );
    }
  } catch (err) {
    console.error('Error creating notifications:', err);
  }
}

module.exports = {
  subscribeToPost,
  unsubscribeFromPost,
  getNotifications,
  markAsRead,
  createNotification
};