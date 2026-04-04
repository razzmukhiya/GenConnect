const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

// Get user's notifications
router.get('/notifications/:userId', authenticate, notificationController.getNotifications);

// Mark single notification as read
router.put('/notifications/:notificationId/read', authenticate, notificationController.markNotificationAsRead);

// Mark all notifications as read
router.put('/notifications/:userId/read-all', authenticate, notificationController.markAllAsRead);

// Get unread count
router.get('/notifications/:userId/unread-count', authenticate, notificationController.getUnreadCount);

module.exports = router;

