-- Create Complete Users Schema for GenConnect
-- This script creates the users table and all related tables with proper relationships
-- Run this SQL in your MySQL database (via phpMyAdmin, MySQL Workbench, or command line)

-- Drop tables in reverse order if they exist (for clean recreation)
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS following;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- 1. Users Table (Core table)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Profiles Table (Additional profile data)
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    coverPhoto VARCHAR(500),
    avatar VARCHAR(500),
    posts INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Following Relationships
CREATE TABLE IF NOT EXISTS following (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    following_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (user_id, following_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Friend Requests
CREATE TABLE IF NOT EXISTS friend_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request (sender_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Friends (Mutual friendships)
CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Messages (Private messaging)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Posts Table (User-generated content)
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_like (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Post Comments
CREATE TABLE IF NOT EXISTS post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Admins Table (Separate admin users)
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
    avatar VARCHAR(500),
    isActive BOOLEAN DEFAULT TRUE,
    lastLogin TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data insertion (optional - remove if not needed)
-- INSERT INTO users (fullName, email, number, dateOfBirth, gender, password) VALUES
-- ('John Doe', 'john@example.com', '1234567890', '1990-01-01', 'male', '$2a$10$hashedpasswordhere'),
-- ('Jane Smith', 'jane@example.com', '0987654321', '1992-05-15', 'female', '$2a$10$hashedpasswordhere');

-- Success message
SELECT 'Users schema created successfully!' as status;
