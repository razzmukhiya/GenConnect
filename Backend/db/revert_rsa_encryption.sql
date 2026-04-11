-- RSA Encryption Revert Migration (Safe/Idempotent)
-- Removes RSA columns, reverts messages to plain 'message' column
-- Run: mysql -u root -p genconnect_db < c:/xampp/htdocs/GenConnect/Backend/db/revert_rsa_encryption.sql
-- WARNING: Drops encrypted_message & key columns (data loss for encrypted content)

-- 1. Drop indexes on encrypted columns if exist
DROP INDEX IF EXISTS idx_encrypted_messages ON messages;
DROP INDEX IF EXISTS idx_public_key_used ON messages;

-- 2. Remove RSA key columns from users (idempotent)
SET @public_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='public_key');
SET @sql_public_drop = IF(@public_exists > 0, 'ALTER TABLE users DROP COLUMN public_key', 'SELECT \"public_key not exists\"');
PREPARE stmt FROM @sql_public_drop; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @private_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='private_key');
SET @sql_private_drop = IF(@private_exists > 0, 'ALTER TABLE users DROP COLUMN private_key', 'SELECT \"private_key not exists\"');
PREPARE stmt FROM @sql_private_drop; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Handle messages table: ensure plain 'message' column exists, drop encrypted_message
-- First, add plain 'message' if missing (copy from encrypted if exists)
SET @msg_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='messages' AND COLUMN_NAME='message');
SET @enc_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='messages' AND COLUMN_NAME='encrypted_message');

-- If plain message missing, add it (empty for now - encrypted data dropped)
SET @sql_add_msg = IF(@msg_exists = 0, 'ALTER TABLE messages ADD COLUMN message TEXT NOT NULL DEFAULT \"\" AFTER encrypted_message', 'SELECT \"message exists\"');
PREPARE stmt FROM @sql_add_msg; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop encrypted_message if exists
SET @sql_drop_enc = IF(@enc_exists > 0, 'ALTER TABLE messages DROP COLUMN encrypted_message', 'SELECT \"encrypted_message not exists\"');
PREPARE stmt FROM @sql_drop_enc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on plain message
CREATE INDEX IF NOT EXISTS idx_messages ON messages(message(191));

-- 4. Verify final schema
SELECT 'Revert Migration complete - Plain text ready!' AS Status;
DESCRIBE users;
DESCRIBE messages;

