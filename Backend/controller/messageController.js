const db = require('../db/connection');

// Get messages between two users (E2EE - ciphertext only)
exports.getMessages = async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!userId || !friendId) {
      return res.status(400).json({ success: false, message: 'User ID and Friend ID required' });
    }

    // Return ONLY encrypted data + keys for client decrypt
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.receiver_id, m.encrypted_text, m.iv, m.auth_tag, m.public_key_fingerprint, m.is_read, m.created_at,
              sender.fullName as senderName, sender.public_key as sender_pubkey, sender.public_key_fingerprint as sender_fingerprint,
              receiver.fullName as receiverName, receiver.public_key as receiver_pubkey, receiver.public_key_fingerprint as receiver_fingerprint
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, friendId, friendId, userId]
    );

    // Mark as read
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

// Send E2EE message (ciphertext + metadata only)
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, encrypted_text, iv, auth_tag } = req.body;

    if (!senderId || !receiverId || !encrypted_text || !iv || !auth_tag) {
      return res.status(400).json({ success: false, message: 'Full E2EE data required: senderId, receiverId, encrypted_text, iv, auth_tag' });
    }

    // Fetch receiver fingerprint for audit
    const [receiverRows] = await db.execute('SELECT public_key_fingerprint FROM users WHERE id = ?', [receiverId]);
    const fingerprint = receiverRows[0]?.public_key_fingerprint || null;

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, encrypted_text, iv, auth_tag, public_key_fingerprint, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [senderId, receiverId, encrypted_text.trim(), iv.trim(), auth_tag.trim(), fingerprint]
    );

    // Get inserted message (no plaintext)
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.receiver_id, m.encrypted_text, m.iv, m.auth_tag, m.is_read, m.created_at,
              sender.fullName as senderName, sender.public_key as sender_pubkey,
              receiver.fullName as receiverName, receiver.public_key as receiver_pubkey
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const newMessage = messages[0];

    // Notification (safe, no content)
    const NotificationModel = require('../models/notificationModel');
    await NotificationModel.createNotification(
      receiverId, 
      'message', 
      senderId, 
      null, 
      newMessage.id,
      'New Message', 
      `New encrypted message from ${newMessage.senderName}`
    );

    // Socket emit (ciphertext only) - FULL E2EE data for client decrypt
    if (global.io) {
      console.log('📤 EMIT newMessage:', senderId, '->', receiverId);
      global.io.to(senderId.toString()).to(receiverId.toString()).emit('newMessage', {
        ...newMessage,
        sender_pubkey: newMessage.sender_pubkey,
        room: `${Math.min(senderId, receiverId)}-${Math.max(senderId, receiverId)}`
      });
      
      global.io.to(receiverId.toString()).emit('newNotification', {
        id: newMessage.id,
        userId: receiverId,
        type: 'message',
        fromUserId: senderId,
        title: 'New Message',
        body: `Encrypted message from ${newMessage.senderName}`,
        created_at: newMessage.created_at
      });
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get conversations (safe E2EE preview - no content leak)
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const [conversations] = await db.execute(
      `SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as friend_id,
        m.id as last_message_id,
        '[Encrypted Message]' as last_message,  -- Safe preview, client decrypts full chat
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

    console.log('👁️ MarkAsRead emit to sender room:', friendId);
    if (global.io) {
      global.io.to(friendId.toString()).emit('messagesSeen', {
        receiverId: userId,
        senderId: friendId,
        count: result.affectedRows
      });
      console.log('✅ messagesSeen emitted to', friendId);
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
