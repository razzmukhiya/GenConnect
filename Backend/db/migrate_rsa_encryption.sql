-- RSA Encryption Migration for Messages
-- Run: mysql -u root -p genconnect_db < Backend/db/migrate_rsa_encryption.sql

-- Add RSA keys to users table
ALTER TABLE users 
ADD COLUMN public_key TEXT AFTER password,
ADD COLUMN private_key TEXT UNIQUE AFTER public_key;

-- Add encrypted_message column (replace message later if needed)
ALTER TABLE messages 
CHANGE COLUMN message encrypted_message TEXT NOT NULL,
ADD COLUMN public_key_fingerprint VARCHAR(64) AFTER encrypted_message;

-- Migrate existing plain messages (optional, encrypt with new keys if needed)
-- UPDATE messages m JOIN users u ON m.receiver_id = u.id SET m.encrypted_message = AES_ENCRYPT(m.message, u.private_key);

-- Update indexes
CREATE INDEX idx_encrypted_messages ON messages(encrypted_message(191));
CREATE INDEX idx_public_key_used ON messages(public_key_used(191));

-- Verify changes
-- SELECT 'Users RSA columns added' as status;
-- DESCRIBE users;
-- DESCRIBE messages;


