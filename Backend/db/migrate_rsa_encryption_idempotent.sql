-- RSA Encryption Migration (Safe/Idempotent - IF NOT EXISTS)
-- Run: mysql -u root -p genconnect_db < Backend/db/migrate_rsa_encryption_idempotent.sql

-- Add RSA keys to users IF NOT EXISTS
SET @public_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='public_key');
SET @sql_public = IF(@public_exists = 0, 'ALTER TABLE users ADD COLUMN public_key TEXT AFTER password;', 'SELECT \"public_key exists\"');
PREPARE stmt FROM @sql_public; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @private_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='private_key');
SET @sql_private = IF(@private_exists = 0, 'ALTER TABLE users ADD COLUMN private_key TEXT UNIQUE AFTER public_key;', 'SELECT \"private_key exists\"');
PREPARE stmt FROM @sql_private; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add encrypted_message to messages IF NOT EXISTS
SET @enc_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='messages' AND COLUMN_NAME='encrypted_message');
SET @sql_enc = IF(@enc_exists = 0, 'ALTER TABLE messages ADD COLUMN encrypted_message TEXT AFTER message;', 'SELECT \"encrypted_message exists\"');
PREPARE stmt FROM @sql_enc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_encrypted_messages ON messages(encrypted_message(191));

-- Verify
SELECT 'Migration complete - RSA ready!' AS Status;
DESCRIBE users;
DESCRIBE messages;
