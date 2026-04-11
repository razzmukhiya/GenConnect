-- E2EE Migration: Add public_key to users; messages → encrypted_text/iv/auth_tag (drop plaintext)
-- Idempotent/Safe. Run: mysql -u root -p genconnect < Backend/db/migrate_e2ee.sql
-- WARNING: Existing messages unreadable post-migration!

USE genconnect;  -- Adjust DB name if different

-- 1. Users: Add public_key IF NOT EXISTS (client EC pub PEM/base64)
SET @public_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='users' AND COLUMN_NAME='public_key');
SET @sql_pub = IF(@public_exists = 0, 'ALTER TABLE users ADD COLUMN public_key TEXT AFTER password;', 'SELECT \"public_key exists\"');
PREPARE stmt FROM @sql_pub; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Messages: Add encrypted cols IF NOT EXISTS
-- Add temp cols first (preserve data if message exists)
SET @enc_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND COLUMN_NAME='encrypted_text');
SET @sql_enc_add = IF(@enc_exists = 0, 'ALTER TABLE messages ADD COLUMN encrypted_text LONGBLOB AFTER message, ADD COLUMN iv VARCHAR(32) AFTER encrypted_text, ADD COLUMN auth_tag VARCHAR(32) AFTER iv;', 'SELECT \"encrypted cols exist\"');
PREPARE stmt FROM @sql_enc_add; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop plaintext message IF exists (after temp cols ready)
SET @msg_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND COLUMN_NAME='message');
SET @sql_drop_msg = IF(@msg_exists > 0, 'ALTER TABLE messages DROP COLUMN message;', 'SELECT \"message col not exists\"');
PREPARE stmt FROM @sql_drop_msg; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Rename temp → final? No, added as-is.

-- Indexes for encrypted (partial prefix)
DROP INDEX IF EXISTS idx_messages ON messages;
CREATE INDEX IF NOT EXISTS idx_encrypted ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_iv ON messages(iv(10));

SELECT 'E2EE Migration Complete! Verify: DESCRIBE users; DESCRIBE messages;' AS status;
DESCRIBE users;
DESCRIBE messages;

