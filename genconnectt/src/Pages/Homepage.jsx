import React, { useState, useEffect } from 'react';
import { FaCamera, FaVideo, FaTag, FaSmile, FaMapMarkerAlt, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import Navbar from '../Components/Navbar';
import '../Styles/Homepage.css';

const API_BASE_URL = 'http://localhost:8000/api';

const Homepage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const currentUser = JSON.parse(localStorage.getItem('user')) || { id: 1, fullName: 'Your Name' };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/posts`);
      const data = await response.json();
      
      if (data.success) {
        const formattedPosts = data.posts.map(post => ({
          id: post.id,
          author: post.fullName,
          avatar: post.avatar ? post.avatar.charAt(0).toUpperCase() : post.fullName.charAt(0).toUpperCase(),
          content: post.content,
          image: post.image_url,
          timestamp: formatTimestamp(post.created_at),
          likes: post.likes_count,
          comments: post.comments_count,
        }));
        setPosts(formattedPosts);
        
        formattedPosts.forEach(post => checkLikeStatus(post.id));
      } else {
        setError('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const checkLikeStatus = async (postId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like-status?userId=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && data.hasLiked) {
        setLikedPosts(prev => new Set([...prev, postId]));
      }
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const isLiked = likedPosts.has(postId);
      const endpoint = `${API_BASE_URL}/posts/${postId}/like`;
      const method = isLiked ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.delete(postId);
          } else {
            newSet.add(postId);
          }
          return newSet;
        });

        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: isLiked ? post.likes - 1 : post.likes + 1
            };
          }
          return post;
        }));
      } else {
        setError(data.message || 'Failed to like/unlike post');
      }
    } catch (err) {
      console.error('Error liking post:', err);
      setError('Error connecting to server. Please try again.');
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedImage) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          content: postContent.trim(),
          imageUrl: selectedImage || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newPost = {
          id: data.post.id,
          author: currentUser.fullName,
          avatar: currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'Y',
          content: data.post.content,
          image: data.post.image_url,
          timestamp: 'Just now',
          likes: 0,
          comments: 0,
        };
        
        setPosts([newPost, ...posts]);
        setPostContent('');
        setSelectedImage(null);
        setIsModalOpen(false);
      } else {
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Error connecting to server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Navbar />
      <div className="homepage-container">
        <div className="homepage-content">
          <div className="main-feed">
            <div className="create-post-section" onClick={() => setIsModalOpen(true)}>
              <div className="create-post-header">
                <div className="create-post-avatar">
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'Y'}
                </div>
                <div className="create-post-input">
                  What's on your mind, {currentUser.fullName || 'Friend'}?
                </div>
              </div>

              <div className="create-post-actions">
                <button className="action-btn">
                  <FaCamera className="action-btn-icon" />
                  Photo
                </button>
                <button className="action-btn">
                  <FaVideo className="action-btn-icon" />
                  Video
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ color: 'red', padding: '10px', marginBottom: '10px', backgroundColor: '#ffebee', borderRadius: '5px' }}>
                {error}
              </div>
            )}

            {loading && (
              <div className="loading-message" style={{ textAlign: 'center', padding: '20px' }}>
                Loading posts...
              </div>
            )}

            <div className="posts-feed-section">
              <h2>Posts from Friends & Others</h2>
              <div className="posts-container">
                {posts.length === 0 && !loading ? (
                  <div className="no-posts-message" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No posts yet. Be the first to create a post!
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className="post-card">
                      <div className="post-header">
                        <div className="post-avatar">{post.avatar}</div>
                        <div className="post-author-info">
                          <h3 className="post-author">{post.author}</h3>
                          <span className="post-timestamp">{post.timestamp}</span>
                        </div>
                      </div>
                      <div className="post-content">
                        <p>{post.content}</p>
                        {post.image && (
                          <div className="post-image">
                            <img src={post.image} alt="Post content" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '10px' }} />
                          </div>
                        )}
                      </div>
                      <div className="post-actions">
                        <button 
                          className="action-btn like-btn" 
                          onClick={() => handleLikePost(post.id)}
                          style={{ 
                            backgroundColor: likedPosts.has(post.id) ? '#e3f2fd' : 'transparent',
                            color: likedPosts.has(post.id) ? '#1976d2' : 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <FaThumbsUp /> {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
                        </button>
                        <button className="action-btn comment-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaComment /> {post.comments} {post.comments === 1 ? 'Comment' : 'Comments'}
                        </button>
                        <button className="action-btn share-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaShare /> Share
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Post</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handlePostSubmit}>
              <div className="modal-body">
                <div className="post-author">
                  <div className="create-post-avatar">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'Y'}
                  </div>
                  <span>{currentUser.fullName || 'Your Name'}</span>
                </div>

                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="modal-textarea"
                  rows="4"
                />
                {selectedImage && (
                  <div className="image-preview">
                    <img src={selectedImage} alt="Preview" />
                    <button type="button" onClick={() => setSelectedImage(null)}>Remove</button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="add-to-post">
                  <span>Add to your post</span>
                  <div className="add-options">
                    <label className="add-option">
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                      <FaCamera />
                    </label>
                    <button type="button" className="add-option"><FaTag /></button>
                    <button type="button" className="add-option"><FaSmile /></button>
                    <button type="button" className="add-option"><FaMapMarkerAlt /></button>
                  </div>
                </div>
                <button type="submit" className="post-submit-btn" disabled={(!postContent.trim() && !selectedImage) || submitting}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Homepage;
