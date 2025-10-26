const pool = require('../config/database');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

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

async function listSubscriptions(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // Get subscribed post ids for this user
    const [subs] = await pool.query('SELECT post_id FROM post_subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, Number(pageSize), Number(offset)]);
    const postIds = subs.map(s => s.post_id);
    if (postIds.length === 0) return res.json({ success: true, posts: [], total: 0 });

    // Reuse post model to fetch each post in detail (keeps formatting consistent)
    const postModel = require('../models/post');
    const posts = [];
    for (const id of postIds) {
      const p = await postModel.getPostById(id);
      if (p) posts.push(p);
    }

    // total count
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM post_subscriptions WHERE user_id = ?', [userId]);
    const total = (countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

    res.json({ success: true, posts, total, page: Number(page), pageSize: Number(pageSize) });
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
    // Get all subscribers (email + id) except the user who triggered the action
    const [subscribers] = await pool.query(
      `SELECT u.id as user_id, u.email, u.login FROM post_subscriptions ps JOIN users u ON ps.user_id = u.id WHERE ps.post_id = ? AND ps.user_id != ?`,
      [postId, triggeredByUserId]
    );

    if (!subscribers || subscribers.length === 0) return;

    // Prepare email transporter only if email notifications are enabled
    const sendEmails = (process.env.EMAIL_NOTIFICATIONS === 'true' || process.env.SEND_NOTIFICATION_EMAILS === 'true');
    let transporter;
    if (sendEmails) {
      try {
        transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT || 587),
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } catch (e) {
        console.error('Failed to create email transporter for notifications', e);
        transporter = null;
      }
    }

    // Insert DB notifications and optionally send email
    for (const subscriber of subscribers) {
      try {
        await pool.query(
          'INSERT INTO notifications (user_id, type, post_id, triggered_by_user_id, message) VALUES (?, ?, ?, ?, ?)',
          [subscriber.user_id, type, postId, triggeredByUserId, message]
        );

        if (sendEmails && transporter && subscriber.email) {
          // Build a short unsubscribe or view link using FRONTEND_URL when available
          const frontend = (process.env.FRONTEND_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
          const viewLink = frontend ? `${frontend}/posts/${postId}` : '';
          const unsubscribeLink = frontend ? `${frontend}/posts/${postId}?unsubscribe=true` : '';
          const subject = type === 'new_comment' ? `New comment on a post you subscribed to` : `Update on a post you subscribed to`;
          const html = `<p>${message}</p>${viewLink ? `<p><a href="${viewLink}">View post</a></p>` : ''}${unsubscribeLink ? `<p><small><a href="${unsubscribeLink}">Unsubscribe</a></small></p>` : ''}`;
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: subscriber.email,
              subject,
              text: `${message} ${viewLink ? '\n' + viewLink : ''}`,
              html
            });
            // Log success so operator can verify mails were dispatched
            console.log(`Notification email sent to ${subscriber.email} for post ${postId}`);
          } catch (e) {
            // Don't fail the whole loop on email errors — just log
            console.error(`Failed to send notification email to ${subscriber.email}:`, e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        // Log DB insertion error but continue for other subscribers
        console.error('Failed to create notification for subscriber', subscriber, e);
      }
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
  listSubscriptions,
  createNotification
};