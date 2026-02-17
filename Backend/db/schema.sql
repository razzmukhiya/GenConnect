-- =====================================================
-- GenConnect Database Schema
-- Friend Functionality Tables
-- =====================================================

-- Users Table (if not already exists)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    number VARCHAR(20) NOT NULL,
    dateOfBirth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    password VARCHAR(255) NOT NULL,
    coverPhoto VARCHAR(500),
    avatar VARCHAR(500),
    posts INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles Table (if not already exists)
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    coverPhoto VARCHAR(500),
    avatar VARCHAR(500),
    posts INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Following Table (for following functionality)
CREATE TABLE IF NOT EXISTS following (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    following_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (user_id, following_user_id)
);

-- =====================================================
-- Friend Functionality Tables
-- =====================================================

-- Friend Requests Table
-- Stores pending friend requests between users
CREATE TABLE IF NOT EXISTS friend_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request (sender_id, receiver_id)
);

-- Friends Table
-- Stores accepted friendships (bidirectional)
CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id)
);

-- =====================================================
-- Sample Queries for Friend Functionality
-- =====================================================

-- 1. Send a Friend Request
-- INSERT INTO friend_requests (sender_id, receiver_id, status) 
-- VALUES (1, 2, 'pending');

-- 2. Accept a Friend Request (requires 2 inserts into friends table)
-- INSERT INTO friends (user_id, friend_id) VALUES (receiver_id, sender_id);
-- INSERT INTO friends (user_id, friend_id) VALUES (sender_id, receiver_id);
-- UPDATE friend_requests SET status = 'accepted' WHERE id = request_id;

-- 3. Decline a Friend Request
-- UPDATE friend_requests SET status = 'rejected' WHERE id = request_id;

-- 4. Get All Pending Friend Requests for a User
-- SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, 
--        u.fullName as senderName, u.email as senderEmail 
-- FROM friend_requests fr 
-- JOIN users u ON fr.sender_id = u.id 
-- WHERE fr.receiver_id = 1 AND fr.status = 'pending' 
-- ORDER BY fr.created_at DESC;

-- 5. Get All Friends of a User
-- SELECT u.id, u.fullName, u.email, u.avatar, f.created_at as friendship_date 
-- FROM friends f 
-- JOIN users u ON f.friend_id = u.id 
-- WHERE f.user_id = 1 
-- ORDER BY f.created_at DESC;

-- 6. Remove a Friend (requires 2 deletes)
-- DELETE FROM friends WHERE user_id = 1 AND friend_id = 2;
-- DELETE FROM friends WHERE user_id = 2 AND friend_id = 1;

-- 7. Check Friendship Status
-- Check if already friends:
-- SELECT id FROM friends 
-- WHERE (user_id = 1 AND friend_id = 2) OR (user_id = 2 AND friend_id = 1);

-- Check if request sent:
-- SELECT id FROM friend_requests 
-- WHERE sender_id = 1 AND receiver_id = 2 AND status = 'pending';

-- Check if request received:
-- SELECT id FROM friend_requests 
-- WHERE sender_id = 2 AND receiver_id = 1 AND status = 'pending';

-- 8. Get Friends Count for a User
-- SELECT COUNT(*) as friend_count FROM friends WHERE user_id = 1;

-- 9. Get Mutual Friends between two users
-- SELECT u.id, u.fullName 
-- FROM friends f1 
-- JOIN friends f2 ON f1.friend_id = f2.friend_id 
-- JOIN users u ON f1.friend_id = u.id 
-- WHERE f1.user_id = 1 AND f2.user_id = 2;

-- 10. Search Users by Name or Email (for friend suggestions)
-- SELECT id, fullName, email, avatar 
-- FROM users 
-- WHERE (fullName LIKE '%search%' OR email LIKE '%search%') 
-- AND id != 1 
-- AND id NOT IN (SELECT friend_id FROM friends WHERE user_id = 1)
-- AND id NOT IN (SELECT receiver_id FROM friend_requests WHERE sender_id = 1 AND status = 'pending')
-- AND id NOT IN (SELECT sender_id FROM friend_requests WHERE receiver_id = 1 AND status = 'pending')
-- LIMIT 10;

-- =====================================================
-- Messages Functionality Tables
-- =====================================================

-- Messages Table
-- Stores direct messages between users
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender_receiver (sender_id, receiver_id),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- Sample Queries for Messages Functionality
-- =====================================================

-- 1. Send a Message
-- INSERT INTO messages (sender_id, receiver_id, message) VALUES (1, 2, 'Hello!');

-- 2. Get Conversation between Two Users
-- SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read, m.created_at,
--        sender.fullName as senderName, receiver.fullName as receiverName
-- FROM messages m
-- JOIN users sender ON m.sender_id = sender.id
-- JOIN users receiver ON m.receiver_id = receiver.id
-- WHERE (m.sender_id = 1 AND m.receiver_id = 2) OR (m.sender_id = 2 AND m.receiver_id = 1)
-- ORDER BY m.created_at ASC;

-- 3. Get All Conversations for a User (latest message from each friend)
-- SELECT DISTINCT 
--   CASE 
--     WHEN m.sender_id = 1 THEN m.receiver_id 
--     ELSE m.sender_id 
--   END as friend_id,
--   m.message as last_message,
--   m.created_at as last_message_time,
--   u.fullName as friendName,
--   u.avatar as friendAvatar
-- FROM messages m
-- JOIN users u ON u.id = CASE 
--     WHEN m.sender_id = 1 THEN m.receiver_id 
--     ELSE m.sender_id 
--   END
-- WHERE m.sender_id = 1 OR m.receiver_id = 1
-- ORDER BY m.created_at DESC;

-- 4. Mark Messages as Read
-- UPDATE messages SET is_read = TRUE WHERE receiver_id = 1 AND sender_id = 2 AND is_read = FALSE;

-- 5. Get Unread Message Count
-- SELECT COUNT(*) as unread_count FROM messages WHERE receiver_id = 1 AND is_read = FALSE;
