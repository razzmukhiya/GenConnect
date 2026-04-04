-- SIMPLE USERS TABLE ONLY - No dependencies, works even with corrupted tablespaces
-- Run this in phpMyAdmin → genconnect → SQL tab

-- Nuclear option: Completely remove users table + tablespace
DROP TABLE IF EXISTS users;
-- If error persists: Manually delete C:\xampp\mysql\data\genconnect\users.ibd

-- Create clean users table
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

-- Verify
DESCRIBE users;
SHOW CREATE TABLE users;

SELECT 'Users table created successfully!' as status;
