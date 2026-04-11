-- Set test public keys & fingerprints for users 5 & 6 (sender/receiver)
-- Run in phpMyAdmin (genconnect DB)

UPDATE users SET 
  public_key = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1234567890abcdef1234567890abc\ndefghijklmnopqrstuvwxyz1234567890abcdef==\n-----END PUBLIC KEY-----' 
WHERE id = 5;

UPDATE users SET public_key_fingerprint = HEX(SHA2(public_key, 256)) WHERE id = 5;

UPDATE users SET 
  public_key = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAExyz7890abcdef1234567890abcdefg\nhijklmnopqrstuvwxyz0987654321fedcba==\n-----END PUBLIC KEY-----' 
WHERE id = 6;

UPDATE users SET public_key_fingerprint = HEX(SHA2(public_key, 256)) WHERE id = 6;

-- Verify
SELECT id, public_key_fingerprint FROM users WHERE id IN (5,6);

-- Test new message insert (send from 6 to 5, expect fingerprint = user5's)
-- SELECT id, sender_id, receiver_id, public_key_fingerprint, created_at FROM messages ORDER BY id DESC LIMIT 1;

