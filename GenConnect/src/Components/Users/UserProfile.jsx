import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

import axios from 'axios';
import { toast } from 'react-toastify';
import Navbar from '../Navbar';
import '../../Styles/UserProfile.css';

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Current authenticated user
  const [currentUser, setCurrentUser] = useState(null);
  
  // Friendship status: 'friends', 'request_sent', 'request_received', 'none'
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [postActionLoading, setPostActionLoading] = useState(false);

  // Fetch posts function
      const fetchPosts = async () => {
        console.log('Fetching posts for profile:', id); // debug
    setPostsLoading(true);
    try {
const postsResponse = await axios.get(`/api/profile/${id}/posts`);
      if (postsResponse.data && postsResponse.data.posts) {
          console.log('Posts response:', postsResponse.data.posts[0]); // debug post structure
          setUserPosts(postsResponse.data.posts);
      } else {
        setUserPosts([]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      toast.error('Failed to load posts');
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };


  const handleEdit = () => {
    setEditedUser({ ...user });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Append basic fields
      formData.append('fullName', editedUser.fullName);
      formData.append('email', editedUser.email);
      formData.append('number', editedUser.number);
      formData.append('dateOfBirth', editedUser.dateOfBirth);
      formData.append('gender', editedUser.gender);
      
      // Append files if present
      if (editedUser.avatarFile) {
        formData.append('avatarFile', editedUser.avatarFile);
      }
      if (editedUser.coverPhotoFile) {
        formData.append('coverPhotoFile', editedUser.coverPhotoFile);
      }
      
      const response = await axios.put(
        `http://localhost:8000/api/profile/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        setUser(response.data.user);
        toast.success('Profile updated!');
        setIsEditing(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      toast.error(err.response?.data?.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(null);
    setIsEditing(false);
  };

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fetch friendship status when user or currentUser changes
  useEffect(() => {
    const fetchFriendshipStatus = async () => {
      if (!currentUser || !user || currentUser.id === user.id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:8000/api/friendship-status/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            params: { userId: currentUser.id }
          }
        );

        
        if (response.data.success) {
          setFriendshipStatus(response.data.status);
          
          // If there's a pending request received, store the request ID
          if (response.data.status === 'request_received') {
            // Fetch friend requests to get the request ID
            const requestsResponse = await axios.get(
              `http://localhost:8000/api/friend-requests/${currentUser.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            
            if (requestsResponse.data.success) {
              const request = requestsResponse.data.friendRequests.find(
                req => req.sender_id === user.id
              );
              if (request) {
                setFriendRequestId(request.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching friendship status:', err);
      }
    };

    if (currentUser && user) {
      fetchFriendshipStatus();
    }
  }, [currentUser, user]);

  // Handle send friend request
  const handleSendFriendRequest = async () => {
    if (!currentUser || !user) return;
    
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/friend-request',
        {
          userId: currentUser.id,
          receiverId: user.id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request sent!');
        setFriendshipStatus('request_sent');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      toast.error(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Handle accept friend request
  const handleAcceptFriendRequest = async () => {
    if (!currentUser || !friendRequestId) return;
    
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/friend-request/accept/${friendRequestId}`,
        { userId: currentUser.id },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request accepted!');
        setFriendshipStatus('friends');
        setFriendRequestId(null);
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      toast.error(err.response?.data?.message || 'Failed to accept friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Handle decline friend request
  const handleDeclineFriendRequest = async () => {
    if (!currentUser || !friendRequestId) return;
    
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/friend-request/decline/${friendRequestId}`,
        { userId: currentUser.id },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request declined');
        setFriendshipStatus('none');
        setFriendRequestId(null);
      }
    } catch (err) {
      console.error('Error declining friend request:', err);
      toast.error(err.response?.data?.message || 'Failed to decline friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async () => {
    if (!currentUser || !user) return;
    
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:8000/api/friends/${user.id}`,
        {
          data: { userId: currentUser.id },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend removed');
        setFriendshipStatus('none');
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      toast.error(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Handle cancel friend request
  const handleCancelFriendRequest = async () => {
    if (!currentUser || !user) return;
    
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:8000/api/friend-request/cancel/${user.id}`,
        {
          data: { userId: currentUser.id },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request cancelled');
        setFriendshipStatus('none');
      }
    } catch (err) {
      console.error('Error cancelling friend request:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel friend request');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Post handlers
  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditedContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editedContent.trim()) return;
    
    setPostActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:8000/api/posts/${editingPost.id}`,
        {
          userId: currentUser.id,
          content: editedContent.trim(),
          imageUrl: editingPost.image_url
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Post updated!');
        setEditingPost(null);
        setEditedContent('');
        await fetchPosts();
      }
    } catch (err) {
      console.error('Edit post error:', err);
      toast.error(err.response?.data?.message || 'Failed to update post');
    } finally {
      setPostActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditedContent('');
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    setPostActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:8000/api/posts/${postId}`, {
        data: { userId: currentUser.id },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Post deleted!');
        await fetchPosts();
      }
    } catch (err) {
      console.error('Delete post error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setPostActionLoading(false);
    }
  };

  // Handle message button click
  const handleMessage = () => {
    if (!user) return;
    navigate(`/messages?userId=${user.id}`);
  };


  // Fetch user profile and posts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;

      try {
        // Fetch profile
        const profileResponse = await axios.get(`http://localhost:8000/api/profile/${id}`);
        if (profileResponse.data.success) {
          setUser(profileResponse.data.user);
        }

        // Fetch posts
        await fetchPosts();
      } catch (err) {
        console.error('Error fetching user data:', err);
        if (err.response?.status !== 404) {
          setError('Error loading profile');
        }
      } finally {
        setLoading(false);
        setPostsLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  if (loading) {
    return <div className="user-profile-loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="user-profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="user-profile-error">User not found</div>;
  }

  return (
    <div className="user-profile-container">
      <Navbar />
      {/* Hero Section with Cover Photo */}

      <div className="profile-hero">
        <div className="cover-photo-overlay">
          <img
            src={user.coverPhoto || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop&crop=center'}
            alt="Cover Photo"
            className="cover-photo"
          />
          <div className="cover-gradient"></div>
        </div>

        {/* Profile Avatar and Basic Info */}
        <div className="profile-header">
          <div className="avatar-container">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&size=120&background=6366f1&color=fff`}
              alt="Profile Avatar"
              className="profile-avatar"
            />
            <div className="avatar-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-info-header">
              <div>
                <h1 className="profile-name">{user.fullName}</h1>
                <p className="profile-username">@{user.fullName.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
              
              {/* Show Edit Profile only for own profile */}
              {currentUser && currentUser.id === user.id && (
                <button className="edit-profile-btn" onClick={handleEdit}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit Profile
                </button>
              )}
              
              {/* Show friend action buttons for other users' profiles */}
              {currentUser && currentUser.id !== user.id && (
                <div className="friend-action-buttons">
                  {/* Message Button - Always visible for other users */}
                  <button 
                    className="message-btn-profile"
                    onClick={handleMessage}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                    Message
                  </button>
                  
                  {friendshipStatus === 'friends' && (

                    <div className="friend-actions-dropdown">
                      <button className="friends-btn" disabled={friendActionLoading}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Friends
                      </button>
                      <div className="dropdown-content">
                        <button 
                          className="dropdown-item remove-friend"
                          onClick={handleRemoveFriend}
                          disabled={friendActionLoading}
                        >
                          Remove Friend
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {friendshipStatus === 'none' && (
                    <button 
                      className="add-friend-btn"
                      onClick={handleSendFriendRequest}
                      disabled={friendActionLoading}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      {friendActionLoading ? 'Sending...' : 'Add Friend'}
                    </button>
                  )}
                  
                  {friendshipStatus === 'request_sent' && (
                    <button 
                      className="cancel-request-btn"
                      onClick={handleCancelFriendRequest}
                      disabled={friendActionLoading}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                      {friendActionLoading ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  )}

                  
                  {friendshipStatus === 'request_received' && (
                    <div className="friend-request-actions">
                      <button 
                        className="accept-btn"
                        onClick={handleAcceptFriendRequest}
                        disabled={friendActionLoading}
                      >
                        {friendActionLoading ? 'Confirming...' : 'Confirm Request'}
                      </button>
                      <button 
                        className="decline-btn"
                        onClick={handleDeclineFriendRequest}
                        disabled={friendActionLoading}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{user.posts}</div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{user.followers}</div>
            <div className="stat-label">Followers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{user.following}</div>
            <div className="stat-label">Following</div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="edit-profile-form">
          <div className="edit-form-container">
            <h2>Edit Profile</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={editedUser.fullName}
                  onChange={(e) => setEditedUser({ ...editedUser, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={editedUser.email}
                  onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="number">Phone</label>
                <input
                  type="tel"
                  id="number"
                  value={editedUser.number}
                  onChange={(e) => setEditedUser({ ...editedUser, number: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  value={editedUser.dateOfBirth ? new Date(editedUser.dateOfBirth).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditedUser({ ...editedUser, dateOfBirth: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  value={editedUser.gender}
                  onChange={(e) => setEditedUser({ ...editedUser, gender: e.target.value })}
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Avatar</label>
                <input
                  type="file"
                  id="avatarFile"
                  name="avatarFile"
                  accept="image/*"
                  onChange={(e) => setEditedUser({ ...editedUser, avatarFile: e.target.files[0] })}
                />
{editedUser?.avatar && (
                  <img src={editedUser.avatar ? editedUser.avatar.replace(/^https?:\/\/localhost:\\d+/, '') : null} alt="Preview" className="preview-image" />
                )}
              </div>
              <div className="form-group">
                <label>Cover Photo</label>
                <input
                  type="file"
                  id="coverPhotoFile"
                  name="coverPhotoFile"
                  accept="image/*"
                  onChange={(e) => setEditedUser({ ...editedUser, coverPhotoFile: e.target.files[0] })}
                />
{editedUser?.coverPhoto && (
                  <img src={editedUser.coverPhoto ? editedUser.coverPhoto.replace(/^https?:\/\/localhost:\\d+/, '') : null} alt="Preview" className="preview-image cover-preview" />
                )}
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
                <button type="submit" disabled={saving} className="save-btn">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="profile-content">
        <div className="content-grid">
          {/* About Section */}
          <div className="about-section">
            <div className="section-card">
              <h2 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                About
              </h2>
              <div className="info-grid">
                {/* <div className="info-item">
                  <div className="info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Email</div>
                    <div className="info-value">{user.email}</div>
                  </div>
                </div> */}

                {/* <div className="info-item">
                  <div className="info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Phone</div>
                    <div className="info-value">{user.number}</div>
                  </div>
                </div> */}

                <div className="info-item">
                  <div className="info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Birthday</div>
                    <div className="info-value">{new Date(user.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Gender</div>
                    <div className="info-value">{user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}</div>
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Member Since</div>
                    <div className="info-value">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Section */}
          <div className="posts-section">
            <div className="section-card">
              <h2 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                Posts ({user.posts})
              </h2>
              {postsLoading ? (
                <div className="posts-loading">Loading posts...</div>
              ) : userPosts.length === 0 ? (
                <div className="no-posts-placeholder">
                  <p>No posts yet</p>
                  <span>This user hasn't posted anything</span>
                </div>
              ) : (
                <div className="posts-grid">
{userPosts.map((post) => {
                    const isOwnPost = currentUser && currentUser.id == post.user_id; // loose check, console.log for debug
                    console.log('Post user_id:', post.user_id, 'Current user:', currentUser?.id, 'Own:', isOwnPost);
                    const isEditing = editingPost && editingPost.id === post.id;
                    
                    return (
                      <div key={post.id} className={`post-card ${isEditing ? 'post-edit-mode' : ''}`}>
                        {post.image_url && (
                          <img 
src={post.image_url ? post.image_url.replace(/^https?:\/\/localhost:\\d+/, '') : null}
                            alt="Post" 
                            className="post-image" 
                          />
                        )}
                        <div className="post-content">
                          {isEditing ? (
                            <>
                              <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                placeholder="Edit post content..."
                                className="post-edit-textarea"
                              />
                              <div className="post-edit-actions">
                                <button 
                                  onClick={handleSaveEdit}
                                  disabled={postActionLoading || !editedContent.trim()}
                                  className="edit-save-btn"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={handleCancelEdit}
                                  disabled={postActionLoading}
                                  className="edit-cancel-btn"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p>{post.content}</p>
{true && (
                                    <div className="post-actions">
                                      <button 
                                        onClick={() => handleEditPost(post)}
                                        title="Edit post"
                                        disabled={postActionLoading}
                                        className="post-edit-btn"
                                      >
                                        <FaEdit />
                                      </button>
                                      <button 
                                        onClick={() => handleDeletePost(post.id)}
                                        title="Delete post"
                                        disabled={postActionLoading}
                                        className="post-delete-btn"
                                      >
                                        <FaTrash />
                                      </button>
                                    </div>
                                  )}
                            </>
                          )}
                          <div className="post-meta">
                            <span className="post-likes">{post.likes_count} likes</span>
                            <span className="post-comments">{post.comments_count} comments</span>
                            <span className="post-time">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
