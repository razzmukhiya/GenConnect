-- Fix posts table: Add shares_count column if missing (for homepage post display)
// Run this in phpMyAdmin or MySQL Workbench on GenConnect database

ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INT DEFAULT 0;

-- Verify column exists
DESCRIBE posts;

-- Update existing posts shares_count to 0 if needed
UPDATE posts SET shares_count = 0 WHERE shares_count IS NULL;

-- Optional: Create shares_count index
ALTER TABLE posts ADD INDEX idx_shares_count (shares_count);

-- Test query (should now work without error)
SELECT p.id, p.user_id, p.content, p.image_url, p.likes_count, p.comments_count, p.shares_count, p.created_at,
       u.fullName, pr.avatar
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN profiles pr ON u.id = pr.user_id
ORDER BY p.created_at DESC LIMIT 5;

-- Restart backend server after running: node Backend/app.js
