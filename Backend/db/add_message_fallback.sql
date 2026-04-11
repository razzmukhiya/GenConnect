-- Add legacy message column for compatibility (safe, NULL for new E2EE rows)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message TEXT NULL AFTER receiver_id;

-- Optional: Update recent BLOBs if they represent plaintext (run if needed)
-- UPDATE messages SET message = CAST(CONVERT(encrypted_text USING latin1) AS CHAR CHARACTER SET utf8mb4) WHERE LENGTH(encrypted_text) < 100 AND encrypted_text IS NOT NULL;

-- Verify
SELECT id, sender_id, receiver_id, message, encrypted_text, LENGTH(encrypted_text) as enc_len FROM messages WHERE encrypted_text IS NOT NULL OR message IS NOT NULL ORDER BY id DESC LIMIT 5;
