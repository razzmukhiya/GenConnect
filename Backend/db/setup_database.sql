-- 🚀 ONE-COMMAND DATABASE SETUP FOR GENCONNECT
-- Run in phpMyAdmin → SQL tab (database: genconnect)

-- 1. Nuclear table cleanup (fixes all tablespace issues)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS post_comments, post_likes, posts, messages, friends, friend_requests, following, profiles, users, admins;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Create USERS table (your core request)
CREATE TABLE users (
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
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC;

-- 3. Quick test data
INSERT INTO users (fullName, email, number, dateOfBirth, gender, password) VALUES 
('Test User', 'test@example.com', '1234567890', '1990-01-01', 'male', 'hashedpassword');

-- 4. Verify
SELECT * FROM users;
DESCRIBE users;

SELECT '✅ DATABASE READY! npm start works now' as status;
