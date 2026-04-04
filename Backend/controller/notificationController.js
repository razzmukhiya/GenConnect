const NotificationModel = require('../models/notificationModel');

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const result = await NotificationModel.getNotificationsByUserId(
      parseInt(userId), 
      parseInt(limit), 
      parseInt(offset)
    );

    if (unreadOnly === 'true') {
      result.notifications = result.notifications.filter(n => !n.is_read);
    }

    res.json({ 
      success: true, 
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    if (!notificationId || !userId) {
      return res.status(400).json({ success: false, message: 'Notification ID and User ID required' });
    }

    const success = await NotificationModel.markAsRead(parseInt(notificationId), parseInt(userId));
    
    if (success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(404).json({ success: false, message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const count = await NotificationModel.markAllAsRead(parseInt(userId));
    res.json({ 
      success: true, 
      message: 'All notifications marked as read',
      count 
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const count = await NotificationModel.getUnreadCount(parseInt(userId));
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

