-- Fix NULL message + public_key_fingerprint for GenConnect
-- Run ALL in phpMyAdmin

-- Ensure message column (safe)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message TEXT NULL AFTER receiver_id;

-- Add fingerprint column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_fingerprint VARCHAR(64) NULL AFTER public_key;

-- Backfill fingerprints (SHA256 of public_key)
UPDATE users SET public_key_fingerprint = HEX(SHA2(public_key, 256)) WHERE public_key IS NOT NULL;

-- Fix recent NULL message (optional - set placeholder)
UPDATE messages SET message = '[E2EE Message]' WHERE message IS NULL AND encrypted_text IS NOT NULL;

-- Verify
SELECT id, sender_id, receiver_id, LENGTH(message), LENGTH(encrypted_text), public_key_fingerprint, created_at FROM messages ORDER BY id DESC LIMIT 5;
SELECT id, email, LENGTH(public_key), public_key_fingerprint FROM users LIMIT 5;
