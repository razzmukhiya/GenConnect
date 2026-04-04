const db = require('../db/connection');

class NotificationModel {
  static async createNotification(userId, type, fromUserId, postId = null, messageId = null, title, body = null) {
    const query = `
      INSERT INTO notifications (user_id, type, from_user_id, post_id, message_id, title, body) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [userId, type, fromUserId, postId, messageId, title, body]);
    return result.insertId;
  }

  static async getNotificationsByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT n.*, 
             u.fullName as fromUserName,
             u.avatar as fromUserAvatar,
             p.content as postContent,
             m.message as messageContent
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN posts p ON n.post_id = p.id  
      LEFT JOIN messages m ON n.message_id = m.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [notifications] = await db.execute(query, [userId, limit, offset]);
    
    // Get unread count
    const [unreadCountResult] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    return {
      notifications,
      unreadCount: unreadCountResult[0].count,
      hasMore: notifications.length === limit
    };
  }

  static async markAsRead(notificationId, userId) {
    const query = `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`;
    const [result] = await db.execute(query, [notificationId, userId]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    const query = `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`;
    const [result] = await db.execute(query, [userId]);
    return result.affectedRows;
  }

  static async getUnreadCount(userId) {
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result[0].count;
  }
}

module.exports = NotificationModel;

