-- Add public_key_fingerprint to messages table for E2EE tracking
-- Safe addition, idempotent

ALTER TABLE messages ADD COLUMN IF NOT EXISTS public_key_fingerprint VARCHAR(64) NULL AFTER auth_tag;

-- Backfill for existing rows (use sender's fingerprint if available)
UPDATE messages m 
JOIN users u ON m.sender_id = u.id 
SET m.public_key_fingerprint = u.public_key_fingerprint 
WHERE m.public_key_fingerprint IS NULL AND u.public_key_fingerprint IS NOT NULL;

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_messages_fingerprint ON messages (public_key_fingerprint);

-- Verify
-- SELECT id, sender_id, public_key_fingerprint, created_at FROM messages ORDER BY id DESC LIMIT 5;

