-- Complete E2EE Migration for GenConnect
-- Add public_key to users, update messages for binary data as base64 TEXT

-- 1. Add public_key to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key LONGTEXT NULL;

-- 2. Update messages table for E2EE (base64 TEXT fields) - safe adds\nALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_text LONGTEXT NULL;\nALTER TABLE messages ADD COLUMN IF NOT EXISTS iv VARCHAR(32) NULL;\nALTER TABLE messages ADD COLUMN IF NOT EXISTS auth_tag VARCHAR(48) NULL;\n\n-- Indexes for performance\nCREATE INDEX IF NOT EXISTS idx_messages_e2ee ON messages (sender_id, receiver_id, created_at DESC);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_e2ee ON messages (sender_id, receiver_id, created_at DESC);

-- Verify
SELECT 'Migration complete' as status;

