import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [privateKeyRaw, setPrivateKeyRaw] = useState(null);
  const [selectedFriendPubKey, setSelectedFriendPubKey] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

// Get current user
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Auto-fetch friends when currentUser loads
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
    }
  }, [currentUser]);

  // Load private key
  const loadPrivateKey = useCallback(async () => {
    let privB64 = localStorage.getItem('localPrivateKey');
    if (!privB64) {
      const cryptoUtils = await import('../utils/crypto.js');
      const keys = await cryptoUtils.generateKeyPair();
      privB64 = keys.privateKey;
      localStorage.setItem('localPrivateKey', privB64);
      const token = localStorage.getItem('token');
      const userId = currentUser?.id;
      if (token && userId) {
        try {
          await axios.put(`${server}/users/${userId}/keys`, { publicKey: keys.publicKey }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.info('E2EE keys generated');
        } catch (e) {
          console.error('Key upload failed:', e);
        }
      }
    }
    try {
      const cryptoUtils = await import('../utils/crypto.js');
      const privRaw = await cryptoUtils.importECKey(privB64, true);
      setPrivateKeyRaw(privRaw);
    } catch (e) {
      console.error('Key import failed:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPrivateKey();
  }, [loadPrivateKey]);

  // Socket connection
  useEffect(() => {
    if (currentUser) {
      const newSocket = io(`${server.replace('/api', '')}`);
      newSocket.on('connect', () => newSocket.emit('join', currentUser.id));
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [currentUser]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = async (messageData) => {
      console.log('New message:', messageData.id);
      if (!selectedChat) return;

      // Match chat
      if (!((messageData.sender_id === selectedChat.id && messageData.receiver_id === currentUser.id) ||
            (messageData.sender_id === currentUser.id && messageData.receiver_id === selectedChat.id))) return;

      const decryptPubkey = messageData.sender_id === currentUser.id ? messageData.receiver_pubkey : messageData.sender_pubkey;
      if (privateKeyRaw && 
          messageData.encrypted_text && messageData.iv && messageData.auth_tag && 
          decryptPubkey && decryptPubkey !== 'null' && decryptPubkey !== null) {
        try {
          const cryptoUtils = await import('../utils/crypto.js');
          messageData.decrypted_text = await cryptoUtils.decryptMessage(
            messageData.encrypted_text,
            messageData.iv,
            messageData.auth_tag,
            privateKeyRaw,
            decryptPubkey
          );
        } catch (e) {
          console.error('Decrypt error:', e);
          messageData.decrypted_text = '[Decrypt failed]';
        }
      } else {
        console.warn('Socket message missing decrypt data:', { 
          hasPrivateKey: !!privateKeyRaw, 
          decryptPubkey, 
          isOwn: messageData.sender_id === currentUser.id
        });
        messageData.decrypted_text = messageData.message || '[Encrypted/No key]';
      }

      setMessages(prev => [...prev, messageData]);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userOnline', (userId) => {
      setFriends(prev => prev.map(f => f.id === parseInt(userId) ? {...f, isOnline: true} : f));
      setOnlineFriends(friends.filter(f => f.isOnline || f.id === parseInt(userId)));
    });
    socket.on('userOffline', (userId) => {
      setFriends(prev => prev.map(f => f.id === parseInt(userId) ? {...f, isOnline: false} : f));
      setOnlineFriends(friends.filter(f => f.isOnline));
    });
    socket.on('onlineUsers', (list) => {
      setFriends(prev => prev.map(f => ({...f, isOnline: list.some(id => parseInt(id) === f.id)})));
      setOnlineFriends(friends.filter(f => list.some(id => parseInt(id) === f.id)));
    });
    socket.on('messagesSeen', (data) => setMessages(prev => prev.map(m => m.sender_id === data.receiverId && m.receiver_id === data.senderId && !m.is_read ? {...m, is_read: true} : m)));

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userOnline');
      socket.off('userOffline');
      socket.off('onlineUsers');
      socket.off('messagesSeen');
    };
  }, [socket, currentUser, selectedChat?.id, privateKeyRaw, friends]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res1 = await axios.get(`${server}/friends/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const res2 = await axios.get(`${server}/friends/${currentUser.id}/online-status`, { headers: { Authorization: `Bearer ${token}` } });
      
      const friends = res1.data.friends.map(friend => ({
        ...friend,
        isOnline: res2.data.onlineFriends.some(id => parseInt(id) === friend.id)
      }));
      
      setFriends(friends);
      setOnlineFriends(friends.filter(f => f.isOnline));
    } catch (e) {
      console.error('Friends fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendPubKey = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${server}/users/public-key/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data.publicKey;
    } catch (e) {
      return null;
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${server}/messages/${currentUser.id}/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      const msgs = res.data.messages || [];
      if (privateKeyRaw) {
        const cryptoUtils = await import('../utils/crypto.js');
        for (let msg of msgs) {
      const decryptPubkey = msg.sender_id === currentUser.id ? msg.receiver_pubkey : msg.sender_pubkey;
      if (privateKeyRaw && msg.encrypted_text && msg.iv && msg.auth_tag && decryptPubkey) {
        try {
          msg.decrypted_text = await cryptoUtils.decryptMessage(
            msg.encrypted_text, msg.iv, msg.auth_tag, privateKeyRaw, decryptPubkey
          );
        } catch (e) {
          console.error('Initial load decrypt error:', e);
          msg.decrypted_text = '[Decrypt fail]';
        }
      } else {
        msg.decrypted_text = msg.message || '[No content]';
      }
        }
      }
      
      setMessages(msgs);
    } catch (e) {
      console.error('Messages fetch failed:', e);
    }
  };

  const handleSelectFriend = async (friend) => {
    setSelectedFriendPubKey(await fetchFriendPubKey(friend.id));
    setSelectedChat(friend);
    fetchMessages(friend.id);
    
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${server}/messages/read/${currentUser.id}/${friend.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const plaintext = newMessage.trim();
    if (!plaintext || !selectedChat) return toast.error('Cannot send');
    
    // Optimistically add to UI with plaintext (for sender)
    const optimisticMsg = {
      id: Date.now(),
      sender_id: currentUser.id,
      receiver_id: selectedChat.id,
      decrypted_text: plaintext,
      created_at: new Date().toISOString(),
      is_read: true
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    
    const token = localStorage.getItem('token');
    let payload = { senderId: currentUser.id, receiverId: selectedChat.id };
    
    if (privateKeyRaw && selectedFriendPubKey) {
      const cryptoUtils = await import('../utils/crypto.js');
      const encrypted = await cryptoUtils.encryptMessage(plaintext, privateKeyRaw, selectedFriendPubKey);
      Object.assign(payload, encrypted);
    } else {
      payload.plainMessage = plaintext;
    }
    
    try {
    const res = await axios.post(`${server}/messages`, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        // Replace optimistic with server message (ensures correct decrypt data)
        const serverMsg = res.data.message;
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? {
          ...serverMsg,
          decrypted_text: plaintext  // Sender knows plaintext
        } : m));
        toast.success('Sent!');
      }
    } catch (e) {
      toast.error('Send failed');
      // Remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  if (!currentUser || loading) return <><Navbar /><div>Loading...</div></>;

  return (
    <>
      <Navbar />
      <div className="messages-page">
        {/* Online bar */}
        <div className="online-bar">
          Online ({onlineFriends.length} active friends)
          {onlineFriends.map(f => (
            <button key={f.id} onClick={() => handleSelectFriend(f)}>{f.fullName?.split(' ')[0]}</button>
          ))}
        </div>

        <div className="chat-container">
          {/* Friends list */}
          <div className="friends-list">
            {friends.map(friend => (
              <button key={friend.id} onClick={() => handleSelectFriend(friend)} className={selectedChat?.id === friend.id ? 'active' : ''}>
                {friend.fullName} {friend.isOnline && '●'}
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {selectedChat ? (
              <>
                <div className="chat-header">{selectedChat.fullName}</div>
                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={msg.sender_id === currentUser.id ? 'own' : 'other'}>
                      <div>{msg.decrypted_text || msg.message || '...'}</div>
                      <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="chat-input">
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Message..." />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <div className="no-chat">Select friend</div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default Messages;

