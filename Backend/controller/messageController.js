const db = require('../db/connection');

// Get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!userId || !friendId) {
      return res.status(400).json({ success: false, message: 'User ID and Friend ID required' });
    }

    // Get conversation between two users
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read, m.created_at,
              sender.fullName as senderName, receiver.fullName as receiverName
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, friendId, friendId, userId]
    );

    // Mark messages as read
    await db.execute(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
      [userId, friendId]
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;

    if (!senderId || !receiverId || !message) {
      return res.status(400).json({ success: false, message: 'Sender ID, Receiver ID and Message are required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself' });
    }

    // Insert the message
    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, receiverId, message]
    );

    // Get the inserted message with user details
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read, m.created_at,
              sender.fullName as senderName, receiver.fullName as receiverName
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const newMessage = messages[0];

    // Create notification for receiver
    const NotificationModel = require('../models/notificationModel');
    await NotificationModel.createNotification(
      receiverId, 
      'message', 
      senderId, 
      null, 
      newMessage.id,
      'New Message', 
      `New message from ${newMessage.senderName}`
    );

    // Emit to both sender and receiver rooms via socket
    if (global.io) {
      global.io.to(senderId.toString()).to(receiverId.toString()).emit('newMessage', {
        ...newMessage,
        room: `${Math.min(senderId, receiverId)}-${Math.max(senderId, receiverId)}`
      });
      
      // Emit notification to receiver only
      global.io.to(receiverId.toString()).emit('newNotification', {
        id: newMessage.id,
        userId: receiverId,
        type: 'message',
        fromUserId: senderId,
        title: 'New Message',
        body: `New message from ${newMessage.senderName}`,
        created_at: newMessage.created_at
      });
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all conversations for a user (latest message from each friend)
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    // Get all conversations with latest message
    const [conversations] = await db.execute(
      `SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as friend_id,
        m.id as last_message_id,
        m.message as last_message,
        m.created_at as last_message_time,
        m.is_read as is_read,
        u.fullName as friendName,
        u.avatar as friendAvatar,
        (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = friend_id AND is_read = FALSE) as unread_count
       FROM messages m
       JOIN users u ON u.id = CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END
       WHERE m.sender_id = ? OR m.receiver_id = ?
       GROUP BY friend_id
       ORDER BY m.created_at DESC`,
      [userId, userId, userId, userId, userId]
    );

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!userId || !friendId) {
      return res.status(400).json({ success: false, message: 'User ID and Friend ID required' });
    }

    const [result] = await db.execute(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
      [userId, friendId]
    );

    // Emit socket event to sender
    if (global.io) {
      global.io.to(friendId).emit('messagesSeen', {
        receiverId: userId,
        senderId: friendId,
        count: result.affectedRows
      });
    }

    res.json({ success: true, message: 'Messages marked as read', count: result.affectedRows });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const [result] = await db.execute(
      'SELECT COUNT(*) as unread_count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({ success: true, unreadCount: result[0].unread_count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
