-- Pure E2EE Migration: DROP plaintext message column
-- SAFE & Idempotent. Run in phpMyAdmin (genconnect DB)
-- ⚠️ BACKUP FIRST! Existing plaintext messages become unreadable.

-- 1. NULL existing E2EE messages (preserve only ciphertext)
SET @e2ee_count = (SELECT COUNT(*) FROM messages WHERE encrypted_text IS NOT NULL AND encrypted_text != '');
SET @null_sql = IF(@e2ee_count > 0, 
  'UPDATE messages SET message = NULL WHERE encrypted_text IS NOT NULL AND encrypted_text != '''';', 
  'SELECT ''No E2EE rows to null'' as status');
PREPARE stmt_null FROM @null_sql; EXECUTE stmt_null; DEALLOCATE PREPARE stmt_null;

-- 2. Check if message column still exists
SET @msg_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND COLUMN_NAME='message');

-- 3. Drop column if exists
SET @drop_sql = IF(@msg_exists > 0, 
  'ALTER TABLE messages DROP COLUMN message;', 
  'SELECT ''message column already dropped'' as status');
PREPARE stmt_drop FROM @drop_sql; EXECUTE stmt_drop; DEALLOCATE PREPARE stmt_drop;

-- 4. Drop obsolete index
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND INDEX_NAME='idx_messages');
SET @drop_idx_sql = IF(@idx_exists > 0, 
  'DROP INDEX idx_messages ON messages;', 
  'SELECT ''idx_messages already gone'' as status');
PREPARE stmt_idx FROM @drop_idx_sql; EXECUTE stmt_idx; DEALLOCATE PREPARE stmt_idx;

-- 5. Verify: Pure E2EE schema
DESCRIBE messages;
SELECT 'Sample row (should have NO message col)' as check, encrypted_text, iv, auth_tag, public_key_fingerprint, created_at FROM messages ORDER BY id DESC LIMIT 3;

-- 🎉 DB now PURE E2EE! No plaintext possible.

