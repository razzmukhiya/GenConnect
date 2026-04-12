-- Add shares_count column to posts table if missing
-- Run in phpMyAdmin (GenConnect DB)

ALTER TABLE posts ADD COLUMN shares_count INT DEFAULT 0 AFTER comments_count;

-- Update existing rows
UPDATE posts SET shares_count = 0 WHERE shares_count IS NULL;

-- Verify
SELECT * FROM posts LIMIT 3;

-- Restart backend after running
