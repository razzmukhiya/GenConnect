const pool = require("../db/connection");

exports.createPostTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content TEXT,
        image_url VARCHAR(500),
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log("Posts table created or already exists");
  } catch (err) {
    console.error("Create posts table error:", err);
    throw new Error(`Create posts table failed: ${err.message}`);
  }
};

exports.createPostLikesTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_post_like (post_id, user_id)
      )
    `);
    console.log("Post likes table created or already exists");
  } catch (err) {
    console.error("Create post_likes table error:", err);
    throw new Error(`Create post_likes table failed: ${err.message}`);
  }
};

exports.createPostCommentsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id)
      )
    `);
    console.log("Post comments table created or already exists");
  } catch (err) {
    console.error("Create post_comments table error:", err);
    throw new Error(`Create post_comments table failed: ${err.message}`);
  }
};

exports.createPost = async (userId, content, imageUrl = null) => {
  try {
    await exports.createPostTable();

    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [userId, content, imageUrl]
    );

    console.log("Post created successfully:", result);
    
    await exports.incrementUserPostCount(userId);
    
    return { 
      id: result.insertId, 
      user_id: userId, 
      content, 
      image_url: imageUrl,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date()
    };
  } catch (err) {
    console.error("Create post error:", err);
    throw new Error(`Create post failed: ${err.message}`);
  }
};

exports.getAllPosts = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.likes_count, p.comments_count, p.created_at,
              u.fullName, pr.avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       ORDER BY p.created_at DESC`
    );
    return rows;
  } catch (err) {
    console.error("Get all posts error:", err);
    throw new Error(`Get all posts failed: ${err.message}`);
  }
};

exports.getPostsByUserId = async (userId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.likes_count, p.comments_count, p.created_at,
              u.fullName, pr.avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (err) {
    console.error("Get posts by user ID error:", err);
    throw new Error(`Get posts by user ID failed: ${err.message}`);
  }
};

exports.getPostById = async (postId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.likes_count, p.comments_count, p.created_at,
              u.fullName, pr.avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE p.id = ?`,
      [postId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("Get post by ID error:", err);
    throw new Error(`Get post by ID failed: ${err.message}`);
  }
};

exports.updatePost = async (postId, userId, content, imageUrl) => {
  try {
    const [existingPost] = await pool.execute(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingPost.length === 0) {
      throw new Error("Post not found or you don't have permission to update it");
    }

    const [result] = await pool.execute(
      'UPDATE posts SET content = ?, image_url = ? WHERE id = ? AND user_id = ?',
      [content, imageUrl, postId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Failed to update post");
    }

    console.log("Post updated successfully");
    return { 
      id: postId, 
      user_id: userId, 
      content, 
      image_url: imageUrl,
      updated_at: new Date()
    };
  } catch (err) {
    console.error("Update post error:", err);
    throw new Error(`Update post failed: ${err.message}`);
  }
};

exports.deletePost = async (postId, userId) => {
  try {
    const [existingPost] = await pool.execute(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingPost.length === 0) {
      throw new Error("Post not found or you don't have permission to delete it");
    }

    const [result] = await pool.execute(
      'DELETE FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Failed to delete post");
    }

    await exports.decrementUserPostCount(userId);

    console.log("Post deleted successfully");
    return true;
  } catch (err) {
    console.error("Delete post error:", err);
    throw new Error(`Delete post failed: ${err.message}`);
  }
};

exports.incrementUserPostCount = async (userId) => {
  try {
    await pool.execute(
      'UPDATE profiles SET posts = posts + 1 WHERE user_id = ?',
      [userId]
    );
    
    await pool.execute(
      'UPDATE users SET posts = posts + 1 WHERE id = ?',
      [userId]
    );
    
    console.log("User post count incremented");
  } catch (err) {
    console.error("Increment post count error:", err);
  }
};

exports.decrementUserPostCount = async (userId) => {
  try {
    await pool.execute(
      'UPDATE profiles SET posts = GREATEST(posts - 1, 0) WHERE user_id = ?',
      [userId]
    );
    
    await pool.execute(
      'UPDATE users SET posts = GREATEST(posts - 1, 0) WHERE id = ?',
      [userId]
    );
    
    console.log("User post count decremented");
  } catch (err) {
    console.error("Decrement post count error:", err);
  }
};

exports.likePost = async (postId, userId) => {
  try {
    await exports.createPostLikesTable();

    const [existingLike] = await pool.execute(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingLike.length > 0) {
      throw new Error("You have already liked this post");
    }

    await pool.execute(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    await pool.execute(
      'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
      [postId]
    );

    console.log("Post liked successfully");
    return true;
  } catch (err) {
    console.error("Like post error:", err);
    throw new Error(`Like post failed: ${err.message}`);
  }
};

exports.unlikePost = async (postId, userId) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("You haven't liked this post");
    }

    await pool.execute(
      'UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?',
      [postId]
    );

    console.log("Post unliked successfully");
    return true;
  } catch (err) {
    console.error("Unlike post error:", err);
    throw new Error(`Unlike post failed: ${err.message}`);
  }
};

exports.addComment = async (postId, userId, comment) => {
  try {
    await exports.createPostCommentsTable();

    const [result] = await pool.execute(
      'INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, userId, comment]
    );

    await pool.execute(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?',
      [postId]
    );

    console.log("Comment added successfully");
    return { 
      id: result.insertId, 
      post_id: postId, 
      user_id: userId, 
      comment,
      created_at: new Date()
    };
  } catch (err) {
    console.error("Add comment error:", err);
    throw new Error(`Add comment failed: ${err.message}`);
  }
};

exports.getCommentsByPostId = async (postId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT pc.id, pc.post_id, pc.user_id, pc.comment, pc.created_at,
              u.fullName, pr.avatar
       FROM post_comments pc
       JOIN users u ON pc.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE pc.post_id = ?
       ORDER BY pc.created_at ASC`,
      [postId]
    );
    return rows;
  } catch (err) {
    console.error("Get comments error:", err);
    throw new Error(`Get comments failed: ${err.message}`);
  }
};

exports.hasUserLikedPost = async (postId, userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Check like status error:", err);
    throw new Error(`Check like status failed: ${err.message}`);
  }
};
