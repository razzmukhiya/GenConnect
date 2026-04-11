-- Backfill ALL existing messages with receiver's fingerprint (better than sender)
UPDATE messages m 
JOIN users u ON m.receiver_id = u.id 
SET m.public_key_fingerprint = u.public_key_fingerprint 
WHERE m.public_key_fingerprint IS NULL AND u.public_key_fingerprint IS NOT NULL;

-- Verify backfill
SELECT id, sender_id, receiver_id, public_key_fingerprint FROM messages WHERE public_key_fingerprint IS NULL LIMIT 5;

