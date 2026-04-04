import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../Components/Navbar';
import '../Styles/Messages.css';
import { io } from 'socket.io-client';
import { FaCheck, FaCheckDouble, FaClock } from 'react-icons/fa';
import { server } from '../../server.js';

const Messages = () => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Get current user from localStorage
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

// Listen for new messages + online status + notifications
  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (messageData) => {
        if (selectedChat && 
            ((messageData.sender_id === selectedChat.id && messageData.receiver_id === currentUser.id) ||
             (messageData.sender_id === currentUser.id && messageData.receiver_id === selectedChat.id))) {
          setMessages(prev => [...prev, messageData]);
        }
      });

      socket.on('newNotification', (notification) => {
        if (notification.type === 'message') {
          toast.info(notification.title);
        }
      });

      socket.on('userOnline', (userId) => {
        setFriends(prev => prev.map(friend => 
          friend.id === userId 
            ? { ...friend, isOnline: true }
            : friend
        ));
        setOnlineFriends(prev => {
          const friend = friends.find(f => f.id === userId);
          if (friend && !prev.some(f => f.id === userId)) {
            return [...prev, friend];
          }
          return prev;
        });
      });

      socket.on('userOffline', (userId) => {
        setFriends(prev => prev.map(friend => 
          friend.id === userId 
            ? { ...friend, isOnline: false }
            : friend
        ));
        setOnlineFriends(prev => prev.filter(f => f.id !== userId));
      });

      socket.on('onlineUsers', (onlineList) => {
        // Optional: Update all friends status from full list
        setFriends(prev => prev.map(friend => ({
          ...friend,
          isOnline: onlineList.includes(friend.id)
        })));
        setOnlineFriends(friends.filter(f => onlineList.includes(f.id)));
      });

      return () => {
        socket.off('newMessage');
        socket.off('newNotification');
        socket.off('userOnline');
        socket.off('userOffline');
        socket.off('onlineUsers');
      };
    }
  }, [socket, selectedChat, currentUser, friends]);

  // Fetch friends when currentUser is available
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
    }
  }, [currentUser]);

  // Set selected chat from navigation state
  useEffect(() => {
    if (location.state?.userId && friends.length > 0) {
      const friend = friends.find(f => f.id === location.state.userId);
      if (friend) {
        setSelectedChat(friend);
        fetchMessages(friend.id);
      }
    }
  }, [location.state, friends]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch friends
      const friendsResponse = await axios.get(
        `${server}/friends/${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      let friends = friendsResponse.data.friends;
      
      // Fetch online status
      const onlineResponse = await axios.get(
        `${server}/friends/${currentUser.id}/online-status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const onlineFriendsIds = onlineResponse.data.onlineFriends || [];
      
      // Add isOnline to each friend
      friends = friends.map(friend => ({
        ...friend,
        isOnline: onlineFriendsIds.includes(friend.id)
      }));
      
      setFriends(friends);
      setOnlineFriends(friends.filter(f => f.isOnline));
      
    } catch (error) {
      console.error('Error fetching friends/online status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${server}/messages/${currentUser.id}/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectFriend = async (friend) => {
    setSelectedChat(friend);
    fetchMessages(friend.id);
    
    // Mark as read when chat selected
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${server}/messages/read/${currentUser.id}/${friend.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Listen for message seen events
  useEffect(() => {
    if (socket) {
      socket.on('messagesSeen', (data) => {
        if (data.senderId === currentUser.id) {
          setMessages(prev => prev.map(msg => 
            msg.sender_id === data.receiverId && 
            msg.receiver_id === data.senderId && 
            msg.is_read === false 
              ? { ...msg, is_read: true }
              : msg
          ));
        }
      });
      return () => socket.off('messagesSeen');
    }
  }, [socket, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${server}/messages`,
        {
          senderId: currentUser.id,
          receiverId: selectedChat.id,
          message: newMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        // Don't add optimistic update since socket will handle it
        setNewMessage('');
        toast.success('Message sent!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="messages-page">
          <div className="messages-container">
            <h1>Please login to view your messages</h1>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="messages-page">
          <div className="messages-container">
            <h1>Loading...</h1>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="messages-page">
        {/* Top: Online Friends Bar */}
        <div className="online-friends-bar">
          <span className="online-friends-label">
            <span className="online-indicator"></span>
            Online Friends
          </span>
          <div className="online-friends-scroll">
            {onlineFriends.length > 0 ? (
              onlineFriends.map(friend => (
                <div 
                  key={friend.id} 
                  className="online-friend-item"
                  onClick={() => handleSelectFriend(friend)}
                >
                  <div className="online-friend-avatar">
                    {friend.fullName ? friend.fullName.charAt(0) : '?'}
                    <span className="online-status-dot"></span>
                  </div>
                  <span className="online-friend-name">
                    {friend.fullName ? friend.fullName.split(' ')[0] : 'User'}
                  </span>
                </div>
              ))
            ) : (
              <span className="online-friends-label" style={{ opacity: 0.5 }}>
                No friends online
              </span>
            )}
          </div>
        </div>

        {/* Main Layout: Friends List on Left + Messages on Right */}
        <div className="messages-layout">
          {/* Left: Friends List (20%) */}
          <div className="friends-sidebar">
            <div className="friends-sidebar-header">
              <h3>👥 Friends ({friends.length})</h3>
            </div>
            <div className="friends-sidebar-list">
              {friends.length > 0 ? (
                friends.map(friend => (
                  <div 
                    key={friend.id} 
                    className={`friend-sidebar-item ${selectedChat?.id === friend.id ? 'active' : ''}`}
                    onClick={() => handleSelectFriend(friend)}
                  >
                    <div className="friend-sidebar-avatar">
                      {friend.fullName ? friend.fullName.charAt(0) : '?'}
                    </div>
                    <div className="friend-sidebar-info">
                      <div className="friend-sidebar-name">{friend.fullName}</div>
                      <div className="friend-sidebar-status">
                        <span className={`status-dot ${friend.isOnline ? 'online' : 'offline'}`}></span>
                        <span>{friend.isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-friends-yet">
                  <p>No friends yet</p>
                  <p>Add friends to start messaging!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Messages Section (80%) */}
          <div className="messages-section">
            {selectedChat ? (
              <>
                <div className="messages-header">
                  <div className="chat-user-info">
                    <div className="chat-user-avatar">
                      {selectedChat.fullName ? selectedChat.fullName.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="chat-user-name">{selectedChat.fullName}</div>
                      <div className={`chat-user-status ${selectedChat.isOnline ? 'online' : 'offline'}`}>
                        ● {selectedChat.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="messages-list">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`message-bubble ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`}
                      >

                        <div className="message-text">{msg.message}</div>
                        <div className="message-meta">
                          <div className="message-time">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                          <div className="message-status">
                            {msg.sender_id === currentUser.id ? (
                              msg.is_read ? <FaCheckDouble className="status-icon seen" /> 
                              : selectedChat?.isOnline ? <FaCheck className="status-icon delivered" /> 
                              : <FaClock className="status-icon sent" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-chat-selected">
                      <div className="no-chat-selected-icon">💬</div>
                      <h3>No messages yet</h3>
                      <p>Send a message to start the conversation!</p>
                    </div>
                  )}
                </div>
                <form className="message-input-container" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="send-btn">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <div className="no-chat-selected-icon">💬</div>
                <h3>Select a conversation</h3>
                <p>Choose a friend from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
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
    </>
  );
};

export default Messages;
