const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');

// Get messages between two users
router.get('/messages/:userId/:friendId', messageController.getMessages);

// Send a message
router.post('/messages', messageController.sendMessage);

// Get all conversations for a user
router.get('/conversations/:userId', messageController.getConversations);

// Mark messages as read
router.put('/messages/read/:userId/:friendId', messageController.markAsRead);

// Get unread message count
router.get('/messages/unread/:userId', messageController.getUnreadCount);

module.exports = router;
