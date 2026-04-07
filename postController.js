const postModel = require('../models/postModel');

exports.createPost = async (req, res) => {
  try {
    const { userId, content, imageUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    const post = await postModel.createPost(userId, content.trim(), imageUrl || null);

    res.status(201).json({ 
      success: true, 
      message: 'Post created successfully', 
      post 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await postModel.getAllPosts();
    
    res.json({ 
      success: true, 
      posts 
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const posts = await postModel.getPostsByUserId(userId);
    
    res.json({ 
      success: true, 
      posts 
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    const post = await postModel.getPostById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({ 
      success: true, 
      post 
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content, imageUrl } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    const updatedPost = await postModel.updatePost(postId, userId, content.trim(), imageUrl || null);

    res.json({ 
      success: true, 
      message: 'Post updated successfully', 
      post: updatedPost 
    });
  } catch (error) {
    console.error('Update post error:', error);
    
    if (error.message.includes("Post not found") || error.message.includes("permission")) {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    await postModel.deletePost(postId, userId);

    res.json({ 
      success: true, 
      message: 'Post deleted successfully' 
    });
  } catch (error) {
    console.error('Delete post error:', error);
    
    if (error.message.includes("Post not found") || error.message.includes("permission")) {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [post] = await db.execute('SELECT user_id, content FROM posts WHERE id = ?', [postId]);
    if (post.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const [liker] = await db.execute('SELECT fullName FROM users WHERE id = ?', [userId]);

    await postModel.likePost(postId, userId);

    // Create notification for post author (only if not self-like)
    if (parseInt(post[0].user_id) !== parseInt(userId)) {
      const NotificationModel = require('../models/notificationModel');
      await NotificationModel.createNotification(
        post[0].user_id,
        'like',
        userId,
        postId,
        null,
        'New Like',
        `${liker[0].fullName} liked your post`
      );

      // Emit socket
      if (global.io) {
        global.io.to(post[0].user_id.toString()).emit('newNotification', {
          id: Date.now(),
          userId: post[0].user_id,
          type: 'like',
          fromUserId: userId,
          postId: postId,
          title: 'New Like',
          body: `${liker[0].fullName} liked your post`,
          created_at: new Date().toISOString()
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Post liked successfully' 
    });
  } catch (error) {
    console.error('Like post error:', error);
    
    if (error.message.includes("already liked")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    await postModel.unlikePost(postId, userId);

    res.json({ 
      success: true, 
      message: 'Post unliked successfully' 
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    
    if (error.message.includes("haven't liked")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, comment } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const newComment = await postModel.addComment(postId, userId, comment.trim());

    res.status(201).json({ 
      success: true, 
      message: 'Comment added successfully', 
      comment: newComment 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    const comments = await postModel.getCommentsByPostId(postId);
    
    res.json({ 
      success: true, 
      comments 
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.checkLikeStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const hasLiked = await postModel.hasUserLikedPost(postId, userId);
    
    res.json({ 
      success: true, 
      hasLiked 
    });
  } catch (error) {
    console.error('Check like status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
