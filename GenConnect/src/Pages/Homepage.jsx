import React, { useState, useEffect } from 'react';
import { FaCamera, FaVideo, FaTag, FaSmile, FaMapMarkerAlt, FaThumbsUp, FaComment, FaShare, FaFlag, FaEllipsisV } from 'react-icons/fa';
import Navbar from '../Components/Navbar';
import '../Styles/Homepage.css';

const API_BASE_URL = '/api';

const Homepage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [reportedPosts, setReportedPosts] = useState(new Set());
  const [menuStates, setMenuStates] = useState({});
  const [reportModal, setReportModal] = useState({ open: false, postId: null });
  const [reportReason, setReportReason] = useState('spam');
  const [otherReason, setOtherReason] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [comments, setComments] = useState({});

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
          avatar: post.avatar
            ? post.avatar.charAt(0).toUpperCase()
            : post.fullName.charAt(0).toUpperCase(),
          content: post.content,
image: post.image_url ? post.image_url.replace(/^https?:\/\/localhost:\\d+/, '') : null,
          timestamp: formatTimestamp(post.created_at),
          likes: post.likes_count,
          comments: post.comments_count,
          shares: post.shares_count || 0,
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

  const handleCommentClick = async (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    
    // Fetch comments if not loaded
    if (!comments[postId]) {
      try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
        const data = await response.json();
        if (data.success) {
          setComments(prev => ({ ...prev, [postId]: data.comments }));
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    }
  };

  const handleSharePost = async (postId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Post shared!');
        setTimeout(() => setSuccessMessage(null), 2000);
        // Refresh posts to update share count
        fetchPosts();
      } else {
        setError(data.message || 'Failed to share post');
      }
    } catch (err) {
      console.error('Error sharing post:', err);
      setError('Error connecting to server');
    }
  };

  const handleCommentSubmit = async (postId, e) => {
    e.preventDefault();
    const input = commentInputs[postId];
    if (!input || !input.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, comment: input.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        // Refresh comments for this post
        const fetchedCommentsResp = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
        const fetchedCommentsData = await fetchedCommentsResp.json();
        if (fetchedCommentsData.success) {
          setComments(prev => ({ ...prev, [postId]: fetchedCommentsData.comments.map(c => ({
            id: c.id,
            content: c.comment,
            fullName: c.fullName,
            avatar: c.avatar
          })) || [] }));
        }
        
        // Refresh post to update count
        // Skip post refresh after comment to avoid unnecessary API calls
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { ...post, comments: post.comments + 1 }
            : post
        ));
        
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setSuccessMessage('Comment posted!');
        setTimeout(() => setSuccessMessage(null), 2000);
      } else {
        setError(data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Error connecting to server');
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const handleLikePost = async (postId) => {
    try {
      const isLiked = likedPosts.has(postId);
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await response.json();

      if (data.success) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          isLiked ? newSet.delete(postId) : newSet.add(postId);
          return newSet;
        });
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 }
              : post
          )
        );
      } else {
        setError(data.message || 'Failed to like/unlike post');
      }
    } catch (err) {
      console.error('Error liking post:', err);
      setError('Error connecting to server');
    }
  };

  const handleCreatePostClick = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedImage) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('content', postContent.trim());

      if (selectedImage && selectedImage.startsWith('data:')) {
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        formData.append('image', blob, 'post-image.jpg');
      }

      const response = await fetch(`${API_BASE_URL}/posts`, { method: 'POST', body: formData });
      const data = await response.json();

      if (data.success) {
        const newPost = {
          id: data.post.id,
          author: currentUser.fullName,
          avatar: currentUser.fullName.charAt(0).toUpperCase(),
          content: data.post.content,
image: data.post.image_url ? data.post.image_url.replace(/^https?:\/\/localhost:\\d+/, '') : null,
          timestamp: 'Just now',
          likes: 0,
          comments: 0,
        };
        setPosts([newPost, ...posts]);
        setPostContent('');
        setSelectedImage(null);
        setIsModalOpen(false);
        setSuccessMessage('Post created successfully! 🎉');
        setTimeout(() => setSuccessMessage(null), 3000);
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

  const handleReportClick = (postId) => {
    setReportModal({ open: true, postId });
    setReportReason('spam');
    setOtherReason('');
    setMenuStates({});
  };

  const handleReportClose = () => {
    setReportModal({ open: false, postId: null });
    setReportReason('spam');
    setOtherReason('');
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason || (reportReason === 'other' && !otherReason.trim())) {
      setError('Please select a reason or provide details for "Other"');
      return;
    }
    const finalReason = reportReason === 'other' ? otherReason.trim() : reportReason;

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/posts/${reportModal.postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterId: currentUser.id, reason: finalReason }),
      });
      const data = await response.json();

      if (data.success) {
        setReportedPosts(prev => new Set([...prev, reportModal.postId]));
        setSuccessMessage('Post reported successfully! ✅');
        setTimeout(() => { setSuccessMessage(null); handleReportClose(); }, 1500);
      } else {
        setError(data.message || 'Failed to report post');
      }
    } catch (err) {
      console.error('Error reporting post:', err);
      setError('Error connecting to server. Please try again.');
    }
  };

  const toggleMenu = (postId, e) => {
    e.stopPropagation();
    setMenuStates(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCopyLink = (postId) => {
    const postLink = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postLink).then(() => {
      setSuccessMessage('Post link copied! 📋');
      setTimeout(() => setSuccessMessage(null), 2000);
    }).catch(() => setError('Failed to copy link'));
    setMenuStates({});
  };

  const handleNotInterested = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSuccessMessage('Post hidden from feed');
    setTimeout(() => setSuccessMessage(null), 2000);
    setMenuStates({});
  };

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenus = () => setMenuStates({});
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  return (
    <>
      <Navbar />
      <div className="homepage-container">
        <div className="homepage-content">
          <div className="main-feed">

            {/* ── Create Post ── */}
            <div
              className="create-post-section"
              role="button"
              tabIndex="0"
              onClick={handleCreatePostClick}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePostClick(e)}
            >
              <div className="create-post-header">
                <div className="create-post-avatar">
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'Y'}
                </div>
                <div className="create-post-input">
                  What's on your mind, {currentUser.fullName || 'Friend'}?
                </div>
              </div>
              <div className="create-post-actions">
                <button className="action-btn" type="button">
                  <FaCamera /> Photo
                </button>
                <button className="action-btn" type="button">
                  <FaVideo /> Video
                </button>
              </div>
            </div>

            {/* ── Feedback Messages ── */}
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading-message">Loading posts...</div>}

            {/* ── Posts Feed ── */}
            <div className="posts-feed-section">
              <h2>Posts from Friends & Others</h2>
              <div className="posts-container">
                {posts.length === 0 && !loading ? (
                  <div className="no-posts-message">
                    No posts yet. Be the first to create a post!
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className="post-card">

                      {/* Header */}
                      <div className="post-header">
                        <div className="post-avatar">{post.avatar}</div>
                        <div className="post-author-info">
                          <h3 className="post-author">{post.author}</h3>
                          <span className="post-timestamp">{post.timestamp}</span>
                        </div>
                        <div className="post-menu" onClick={(e) => toggleMenu(post.id, e)}>
                          <FaEllipsisV />
                          {menuStates[post.id] && (
                            <div className="post-menu-dropdown">
                              <button onClick={() => handleCopyLink(post.id)}>🔗 Copy link</button>
                              <button onClick={() => handleNotInterested(post.id)}>🚫 Not interested</button>
                              <button onClick={() => handleReportClick(post.id)}>
                                <FaFlag /> Report post
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="post-body">
                        <p>{post.content}</p>
                        {post.image ? (
                          <img src={post.image} alt="Post content" className="post-image" />
                        ) : null}
                      </div>

                      {/* Actions */}
<div className="post-actionss">
                        <button
                          className={`action-button like-btn ${likedPosts.has(post.id) ? 'liked' : ''}`}
                          onClick={() => handleLikePost(post.id)}
                        >
                          <FaThumbsUp /> {post.likes}
                        </button>
                        <button
                          className="action-button comment-btn"
                          onClick={() => handleCommentClick(post.id)}
                        >
                          <FaComment /> {post.comments}
                        </button>
                        <button 
                          className="action-button share-btn" 
                          onClick={() => handleSharePost(post.id)}
                        >
                          <FaShare /> {post.shares || 0}
                        </button>
                      </div>

                      {/* Comments */}
                      {expandedComments[post.id] && (
                        <div className="comments-section expanded">
                          <div className="comment-list">
                            {comments[post.id]?.map(comment => {
                              const avatarUrl = comment.avatar ? comment.avatar.replace(/^https?:\/\/[^\/]+/, '') : null;
                              const avatarInitial = comment.fullName ? comment.fullName.charAt(0).toUpperCase() : '?';
                              return (
                                <div key={comment.id} className="comment-bubble">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt="" className="comment-avatar-img" />
                                  ) : (
                                    <div className="comment-avatar">{avatarInitial}</div>
                                  )}
                                  <div className="comment-content">{comment.content}</div>
                                </div>
                              );
                            })}
                          </div>
                          <form
                            className="comment-input-container"
                            onSubmit={(e) => handleCommentSubmit(post.id, e)}
                          >
                            <div className="comment-avatar-you">
                              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'Y'}
                            </div>
                            <input
                              className="comment-input"
                              placeholder="Write a comment..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                            />
                            <button
                              className="comment-post-btn"
                              type="submit"
                              disabled={!commentInputs[post.id]?.trim()}
                            >
                              Post
                            </button>
                          </form>
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Create Post Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Post</h3>
              <button className="modal-close" type="button" onClick={() => setIsModalOpen(false)}>×</button>
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
                    <img src={selectedImage} alt="Preview" className="preview-image" />
                    <button type="button" className="remove-image-btn" onClick={() => setSelectedImage(null)}>
                      Remove
                    </button>
                  </div>
                )}
                <div className="add-to-post">
                  <span>Add to your post</span>
                  <div className="add-options">
                    <label className="add-option" data-tooltip="Photo">
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                      <FaCamera />
                    </label>
                    <button type="button" className="add-option" data-tooltip="Tag"><FaTag /></button>
                    <button type="button" className="add-option" data-tooltip="Feeling"><FaSmile /></button>
                    <button type="button" className="add-option" data-tooltip="Location"><FaMapMarkerAlt /></button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="submit"
                  className="post-submit-btn"
                  disabled={(!postContent.trim() && !selectedImage) || submitting}
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Modal ── */}
      {reportModal.open && (
        <div className="modal-overlay" onClick={handleReportClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FaFlag style={{ marginRight: '0.5rem', color: '#E03131' }} />Report Post</h3>
              <button className="modal-close" onClick={handleReportClose}>×</button>
            </div>
            <form onSubmit={handleReportSubmit}>
              <div className="modal-body">
                <div className="report-reason-section">
                  <label className="report-label">What's the issue?</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="modal-select"
                  >
                    <option value="spam">🕸️ Spam</option>
                    <option value="harassment">👥 Harassment</option>
                    <option value="inappropriate_content">🚫 Inappropriate content</option>
                    <option value="violence">⚠️ Violent content</option>
                    <option value="misinformation">❌ Misinformation</option>
                    <option value="other">📝 Other</option>
                  </select>
                  {reportReason === 'other' && (
                    <textarea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Please describe the issue..."
                      className="modal-textarea"
                      rows="3"
                    />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-cancel-btn" onClick={handleReportClose}>
                  Cancel
                </button>
                <button type="submit" className="post-submit-btn report-submit-btn">
                  Submit Report
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