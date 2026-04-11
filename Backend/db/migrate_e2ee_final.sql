-- E2EE Final Migration: Add ALL required columns idempotently
-- Run in phpMyAdmin/XAMPP MySQL for 'genconnect' DB
-- Safe: Checks existence before ALTER

-- 1. Users table: public_key + fingerprint
SET @pk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='users' AND COLUMN_NAME='public_key');
SET @sql_pk = IF(@pk_exists = 0, 'ALTER TABLE users ADD COLUMN public_key LONGTEXT NULL AFTER avatar, ADD COLUMN public_key_fingerprint VARCHAR(64) NULL AFTER public_key;', 'SELECT \"users.public_key exists\"');
PREPARE stmt_pk FROM @sql_pk; EXECUTE stmt_pk; DEALLOCATE PREPARE stmt_pk;

-- 2. Messages table: encrypted cols + fingerprint
SET @enc_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND COLUMN_NAME='encrypted_text');
SET @sql_enc_add = IF(@enc_exists = 0, 'ALTER TABLE messages ADD COLUMN encrypted_text LONGTEXT NULL AFTER message, ADD COLUMN iv VARCHAR(32) NULL AFTER encrypted_text, ADD COLUMN auth_tag VARCHAR(48) NULL AFTER iv, ADD COLUMN public_key_fingerprint VARCHAR(64) NULL AFTER auth_tag;', 'SELECT \"messages.encrypted cols exist\"');
PREPARE stmt_enc FROM @sql_enc_add; EXECUTE stmt_enc; DEALLOCATE PREPARE stmt_enc;

-- 3. Make message nullable (for pure E2EE)
SET @msg_nullable = (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='genconnect' AND TABLE_NAME='messages' AND COLUMN_NAME='message');
SET @sql_msg_null = IF(@msg_nullable = 'NO', 'ALTER TABLE messages MODIFY COLUMN message TEXT NULL;', 'SELECT \"message already nullable\"');
PREPARE stmt_msg FROM @sql_msg_null; EXECUTE stmt_msg; DEALLOCATE PREPARE stmt_msg;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_e2ee ON messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_pubkey ON users (public_key_fingerprint);

-- 5. Verify
SELECT 'users schema check' as check_type, public_key, public_key_fingerprint FROM users LIMIT 3;
SELECT 'messages schema check' as check_type, encrypted_text, iv, auth_tag, public_key_fingerprint, message FROM messages ORDER BY id DESC LIMIT 3;

-- 🎉 Schema ready for E2EE!

