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

    // Preferred decrypt path on the client expects ciphertext_b64.
    // In our storage for new format, encrypted_text already contains base64(ciphertext||tag).
    for (const m of messages) {
      m.ciphertext_b64 = m.encrypted_text || null;
    }





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
    const {
      senderId,
      receiverId,
      encrypted_text,
      iv,
      auth_tag,
      ciphertext_b64,
      plainMessage
    } = req.body;

    // Robust validation - check for empty strings and null
    if (!senderId || !receiverId) {
      return res.status(400).json({ success: false, message: 'User IDs required' });
    }

    // Accept either:
    // 1) Legacy: encrypted_text + iv + auth_tag
    // 2) New: ciphertext_b64 + iv  (server will split ciphertext_b64 into encrypted_text+auth_tag)
    // 3) plainMessage fallback (degraded)
    const hasLegacyE2EE =
      encrypted_text && typeof encrypted_text === 'string' && encrypted_text.trim().length > 0 &&
      iv && typeof iv === 'string' && iv.trim().length > 0 &&
      auth_tag && typeof auth_tag === 'string' && auth_tag.trim().length > 0;

    const hasNewE2EE =
      ciphertext_b64 && typeof ciphertext_b64 === 'string' && ciphertext_b64.trim().length > 0 &&
      iv && typeof iv === 'string' && iv.trim().length > 0;

    const hasPlain = plainMessage && typeof plainMessage === 'string' && plainMessage.trim().length > 0;

    if (!hasLegacyE2EE && !hasNewE2EE && !hasPlain) {
      console.error('SendMessage: missing E2EE data AND plainMessage', {
        hasLegacyE2EE,
        hasNewE2EE,
        hasPlain
      });
      return res.status(400).json({ success: false, message: 'Either encrypted text OR plain message required' });
    }

    // If no E2EE, use plainMessage fallback (degraded mode)
    let encText = encrypted_text;
    let ivText = iv;
    let tagText = auth_tag;
    let msgContent = plainMessage;

    if (!hasLegacyE2EE && hasPlain) {
      // Use plain message - encode as base64 for fallback
      // This is NOT truly encrypted - just base64 encoded for storage
      console.warn('Using plainMessage fallback - message not E2EE');
      encText = Buffer.from(plainMessage.trim()).toString('base64');
      ivText = 'cGxhaW4='; // 'plain' in base64
      tagText = 'ZmFsbGJhY2s='; // 'fallback' in base64
      msgContent = plainMessage;
    }

    if (!hasLegacyE2EE && hasNewE2EE) {
      // Client sends ciphertext_b64 = base64(ciphertext||authTag) (AES-GCM) [preferred format]
      // To avoid any ciphertext splitting/reconstruction mismatches, store the combined payload directly:
      // - DB encrypted_text  := ciphertext_b64 (combined ciphertext||tag, still base64)
      // - DB auth_tag        := '' (intentionally blank)
      encText = ciphertext_b64;
      tagText = '';
      msgContent = null;
    }


    // Fetch receiver fingerprint for audit
    const [receiverRows] = await db.execute('SELECT public_key_fingerprint FROM users WHERE id = ?', [receiverId]);
    const fingerprint = receiverRows[0]?.public_key_fingerprint || null;

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, encrypted_text, iv, auth_tag, public_key_fingerprint, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [senderId, receiverId, encText.trim(), ivText.trim(), tagText.trim(), fingerprint]
    );

    // Get inserted message (no plaintext)
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.receiver_id, m.encrypted_text, m.iv, m.auth_tag, m.is_read, m.created_at,
              sender.fullName as senderName, sender.public_key as sender_pubkey,
              sender.public_key_fingerprint as sender_fingerprint,
              receiver.fullName as receiverName, receiver.public_key as receiver_pubkey,
              receiver.public_key_fingerprint as receiver_fingerprint
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE m.id = ?`,
      [result.insertId]
    );


    const newMessage = messages[0];

    // Preferred decrypt path on the client expects ciphertext_b64.
    // In our storage for new format, encrypted_text already contains base64(ciphertext||tag).
    newMessage.ciphertext_b64 = newMessage.encrypted_text || null;


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
      // Ensure client always has pubkeys to derive shared secret
      const senderPub = newMessage.sender_pubkey || null;
      const receiverPub = newMessage.receiver_pubkey || null;

      console.log('📤 EMIT newMessage:', senderId, '->', receiverId);
      console.log('   sender_pubkey:', senderPub ? 'present' : 'NULL');
      console.log('  receiver_pubkey:', receiverPub ? 'present' : 'NULL');

      global.io.to(senderId.toString()).to(receiverId.toString()).emit('newMessage', {
        ...newMessage,
        ciphertext_b64: newMessage.ciphertext_b64 || null,
        sender_pubkey: senderPub,
        receiver_pubkey: receiverPub,
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