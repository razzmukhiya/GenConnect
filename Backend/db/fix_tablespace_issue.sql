-- Fix MySQL Tablespace Error #1813 for GenConnect Database
-- Run these commands in phpMyAdmin → genconnect database → SQL tab

-- 1. Discard corrupted tablespace for users table
ALTER TABLE users DISCARD TABLESPACE;

-- 2. Drop the tablespace files (if accessible via file system)
-- Note: You may need to delete .ibd files manually from MySQL data directory
-- Windows: C:\xampp\mysql\data\genconnect\users.ibd
-- Linux/Mac: /var/lib/mysql/genconnect/users.ibd

-- 3. Recreate the users table cleanly
DROP TABLE IF EXISTS users;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Verify table creation
SHOW CREATE TABLE users;

-- 5. Success message
SELECT 'Users table recreated successfully after tablespace fix!' as status;

-- Optional: Import full schema after this fix
-- SOURCE Backend/db/create_users_schema.sql;
