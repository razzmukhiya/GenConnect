import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import { FaUserPlus, FaComment, FaHeart, FaPaperPlane, FaShare, FaBell, FaCheck, FaTimes } from 'react-icons/fa';
import Navbar from '../Components/Navbar';
import '../Styles/Notifications.css';
import { server } from '../../server.js';

// Utility function to format time ago
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
};

// Skeleton component for loading state
const SkeletonNotification = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-icon"></div>
    <div className="skeleton-content">
      <div className="skeleton skeleton-line long"></div>
      <div className="skeleton skeleton-line short"></div>
    </div>
  </div>
);

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  // Get current user
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (currentUser) {
      const newSocket = io(`${server.replace('/api', '')}`);
      setSocket(newSocket);

      newSocket.emit('join', currentUser.id);

      return () => newSocket.close();
    }
  }, [currentUser]);

  // Socket listeners
  useEffect(() => {
    if (socket && currentUser) {
      socket.on('newNotification', (notification) => {
        setNotifications(prev => [{ ...notification, isNew: true }, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.info(notification.title, { 
          toastId: `notif-${notification.id}`,
          position: "top-right"
        });
      });

      socket.on('notificationRead', () => {
        fetchNotifications();
      });

      return () => {
        socket.off('newNotification');
        socket.off('notificationRead');
      };
    }
  }, [socket, currentUser]);

  const fetchNotifications = useCallback(async (refresh = false) => {
    try {
      const token = localStorage.getItem('token');
      const offset = refresh ? 0 : notifications.length;
      const response = await axios.get(
        `${server}/notifications/${currentUser.id}?limit=20&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        if (refresh) {
          setNotifications(response.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.data.notifications]);
        }
        setUnreadCount(response.data.unreadCount);
        setHasMore(response.data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser, notifications.length]);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications(true);
    }
  }, [currentUser, fetchNotifications]);

  const handleMarkRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${server}/notifications/${notificationId}/read`,
        { userId: currentUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true, isNew: false } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (socket) {
        socket.emit('markNotificationRead', { 
          userId: currentUser.id, 
          notificationId 
        });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${server}/notifications/${currentUser.id}/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, isNew: false })));
      setUnreadCount(0);
      toast.success('All notifications marked as read!');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleAcceptFriendRequest = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${server}/friend-request/accept/${notification.friendRequestId || notification.id}`,
        { userId: currentUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Friend request accepted!');
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to accept friend request');
    }
  };

  const handleDismiss = async (notificationId, e) => {
    e.stopPropagation();
    // Add dismiss animation
    const element = document.getElementById(`notif-${notificationId}`);
    if (element) {
      element.classList.add('dismissing');
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }, 300);
    }
    await handleMarkRead(notificationId);
  };

  const getIconComponent = (type) => {
    const size = '1.25rem';
    switch (type) {
      case 'friend_request': return <FaUserPlus size={size} />;
      case 'message': return <FaPaperPlane size={size} />;
      case 'like': return <FaHeart size={size} />;
      case 'comment': return <FaComment size={size} />;
      case 'share': return <FaShare size={size} />;
      default: return <FaBell size={size} />;
    }
  };

  const getIconClass = (type) => `notification-icon ${type.replace('_', '-')}`;

  const lastNotificationRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true);
        fetchNotifications();
      }
    });
    if (node) observer.current.observe(node);
  }, [fetchNotifications, hasMore, loadingMore]);

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="notifications-page">
          <div className="notifications-header">
            <h1 className="notifications-title">Notifications</h1>
          </div>
          <div className="no-notifications">
            <div className="no-notifications-icon">🔐</div>
            <h3>Please login to view your notifications</h3>
            <p>Sign in to see updates from your friends</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="notifications-page">
        <div className="notifications-header">
          <h1 className="notifications-title">
            Notifications 
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </h1>
          {unreadCount > 0 && (
            <button className="btn-notification btn-read" onClick={handleMarkAllRead}>
              <FaCheck style={{ marginRight: '5px' }} />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="notifications-list">
            <SkeletonNotification />
            <SkeletonNotification />
            <SkeletonNotification />
            <SkeletonNotification />
            <SkeletonNotification />
          </div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">
            <div className="no-notifications-icon">🔔</div>
            <h3>No notifications yet</h3>
            <p>You'll see updates from your friends here</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                id={`notif-${notification.id}`}
                ref={index === notifications.length - 1 ? lastNotificationRef : null}
                className={`notification-item ${notification.is_read ? 'read' : 'unread'} ${notification.isNew ? 'new' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <div className={getIconClass(notification.type)}>
                  {getIconComponent(notification.type)}
                </div>
<div className="notification-content">
                  <div className="notification-title-text">{notification.title}</div>
                  {notification.body && (
                    <div className="notification-body">{notification.body}</div>
                  )}
                  {notification.postContent && (
                    <div className="notification-message-content">
                      <p>"{notification.postContent.substring(0, 100)}..."</p>
                    </div>
                  )}
                  <div className="notification-meta">
                    <span className="notification-time">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                </div>
                {notification.type === 'friend_request' && (
                  <div className="notification-actions">
                    <button 
                      className="btn-notification btn-accept"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptFriendRequest(notification);
                      }}
                    >
                      <FaCheck /> Accept
                    </button>
                    <button 
                      className="btn-notification btn-decline"
                      onClick={(e) => handleDismiss(notification.id, e)}
                    >
                      <FaTimes /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loadingMore && (
              <div className="loading">Loading more...</div>
            )}
          </div>
        )}

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </>
  );
};

export default Notifications;
