import React, { useState, useEffect, useRef } from 'react';
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
  const [pendingSocketMessages, setPendingSocketMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
    }
  }, [currentUser]);

  const loadPrivateKeyRef = useRef(false);

  useEffect(() => {
    if (loadPrivateKeyRef.current) return;

const tryLoadKey = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        console.log('No user in localStorage, retrying...');
        setTimeout(tryLoadKey, 500);
        return;
      }

      const userObj = JSON.parse(storedUser);
      console.log('Loading key for user:', userObj.id);
      loadPrivateKeyRef.current = true;

      let privB64 = localStorage.getItem('localPrivateKey');
      console.log('Existing private key:', privB64 ? 'present' : 'NONE');
      
      if (!privB64) {
        console.log('Generating new key pair...');
        try {
          const cryptoUtils = await import('../utils/crypto.js');
          const keys = await cryptoUtils.generateKeyPair();
          console.log('Keys generated, pubkey length:', keys.publicKey.length);
          privB64 = keys.privateKey;
          localStorage.setItem('localPrivateKey', privB64);
          
          const token = localStorage.getItem('token');
          console.log('Token exists:', !!token);
          if (token && userObj.id) {
            try {
              await axios.put(`${server}/users/${userObj.id}/keys`, { publicKey: keys.publicKey }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              console.log('Public key uploaded to server');
              toast.info('E2EE keys generated');
            } catch (e) {
              console.error('Key upload failed:', e);
            }
          }
        } catch (genErr) {
          console.error('Key generation failed:', genErr);
          loadPrivateKeyRef.current = false;
          return;
        }
      }
      
      console.log('Attempting to import private key...');
      try {
        const cryptoUtils = await import('../utils/crypto.js');
        const privRaw = await cryptoUtils.importECKey(privB64, true);
        // Handle null return from importECKey (invalid/corrupted key)
        if (!privRaw) {
          console.warn('Imported private key is null, clearing and regenerating...');
          localStorage.removeItem('localPrivateKey');
          loadPrivateKeyRef.current = false;
          // Retry with new key generation
          setTimeout(tryLoadKey, 500);
          return;
        }
        setPrivateKeyRaw(privRaw);
        console.log('Private key loaded successfully');
      } catch (e) {
        console.error('Key import failed:', e);
        loadPrivateKeyRef.current = false;
      }
    };

    tryLoadKey();
  }, []);

// Helper to detect plaintext fallback messages (when E2EE encryption fails)
  const isFallbackMessage = (msg) => {
    return msg.iv === 'cGxhaW4=' && msg.auth_tag === 'ZmFsbGJhY2s=';
  };

  // Helper to decode fallback plaintext message
  const decodeFallbackMessage = (msg) => {
    try {
      const plainBytes = Uint8Array.from(atob(msg.encrypted_text), c => c.charCodeAt(0));
      return new TextDecoder().decode(plainBytes);
    } catch (e) {
      console.error('Fallback decode error:', e);
      return 'Message could not be decrypted';
    }
  };

  const decryptMessageData = async (messageData, privKey, currentUserId) => {
    // Check for plaintext fallback message first (when encryption failed during send)
    if (isFallbackMessage(messageData)) {
      return decodeFallbackMessage(messageData);
    }

    let decryptPubkey = null;
    const isOwnMessage = messageData.sender_id === currentUserId;

    if (isOwnMessage) {
      decryptPubkey = messageData.receiver_pubkey;
    } else {
      decryptPubkey = messageData.sender_pubkey;
    }

    if (!decryptPubkey || decryptPubkey === 'null' || decryptPubkey === null) {
      console.warn('Missing pubkey in socket message, fetching...');
      const friendId = isOwnMessage ? messageData.receiver_id : messageData.sender_id;
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${server}/users/public-key/${friendId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        decryptPubkey = res.data.publicKey;
        console.log('Fetched pubkey for friend', friendId, ':', decryptPubkey ? 'present' : 'NULL');
      } catch (e) {
        console.error('Failed to fetch pubkey:', e);
      }
    }

    if (privKey &&
        messageData.encrypted_text && messageData.iv && messageData.auth_tag &&
        decryptPubkey && decryptPubkey !== 'null' && decryptPubkey !== null) {
      try {
        const cryptoUtils = await import('../utils/crypto.js');
        return await cryptoUtils.decryptMessage(
          messageData.encrypted_text,
          messageData.iv,
          messageData.auth_tag,
          privKey,
          decryptPubkey
        );
      } catch (e) {
        console.error('Decrypt error:', e);
        return 'Message could not be decrypted';
      }
    } else {
      console.warn('Socket message missing decrypt data:', {
        hasPrivateKey: !!privKey,
        decryptPubkey,
        isOwn: isOwnMessage
      });
      return messageData.message || 'Message could not be decrypted';
    }
  };

  useEffect(() => {
    if (!privateKeyRaw || pendingSocketMessages.length === 0 || !currentUser) return;

    const processPendingMessages = async () => {
      console.log('Processing', pendingSocketMessages.length, 'pending messages');

      for (const msg of pendingSocketMessages) {
        if (!selectedChat) continue;
        if (!((msg.sender_id === selectedChat.id && msg.receiver_id === currentUser.id) ||
              (msg.sender_id === currentUser.id && msg.receiver_id === selectedChat.id))) continue;

        const decrypted = await decryptMessageData(msg, privateKeyRaw, currentUser.id);
        msg.decrypted_text = decrypted;
        setMessages(prev => [...prev, msg]);
      }

      setPendingSocketMessages([]);
    };

    processPendingMessages();
  }, [privateKeyRaw, pendingSocketMessages.length, currentUser, selectedChat]);

  useEffect(() => {
    if (currentUser) {
      const newSocket = io(`${server.replace('/api', '')}`);
      newSocket.on('connect', () => newSocket.emit('join', currentUser.id));
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = async (messageData) => {
      console.log('New message:', messageData.id);
      if (!selectedChat) return;

      if (!((messageData.sender_id === selectedChat.id && messageData.receiver_id === currentUser.id) ||
            (messageData.sender_id === currentUser.id && messageData.receiver_id === selectedChat.id))) return;

      if (!privateKeyRaw) {
        console.log('Private key not ready, queuing message for later');
        setPendingSocketMessages(prev => [...prev, messageData]);
        return;
      }

      const decrypted = await decryptMessageData(messageData, privateKeyRaw, currentUser.id);
      messageData.decrypted_text = decrypted;
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
          // Check for plaintext fallback message first
          if (isFallbackMessage(msg)) {
            msg.decrypted_text = decodeFallbackMessage(msg);
            continue;
          }
          
          const decryptPubkey = msg.sender_id === currentUser.id ? msg.receiver_pubkey : msg.sender_pubkey;
          if (privateKeyRaw && msg.encrypted_text && msg.iv && msg.auth_tag && decryptPubkey) {
            try {
              msg.decrypted_text = await cryptoUtils.decryptMessage(
                msg.encrypted_text, msg.iv, msg.auth_tag, privateKeyRaw, decryptPubkey
              );
            } catch (e) {
              console.error('Initial load decrypt error:', e);
              msg.decrypted_text = 'Message could not be decrypted';
            }
          } else {
            msg.decrypted_text = msg.message || 'Message could not be decrypted';
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

    const token = localStorage.getItem('token');
    let payload = { senderId: currentUser.id, receiverId: selectedChat.id };
    let sendFallback = false;

    if (privateKeyRaw && selectedFriendPubKey) {
      try {
        const cryptoUtils = await import('../utils/crypto.js');
        const encrypted = await cryptoUtils.encryptMessage(plaintext, privateKeyRaw, selectedFriendPubKey);

        if (!encrypted || !encrypted.encrypted_text || !encrypted.iv || !encrypted.auth_tag) {
          console.error('Encryption returned invalid data:', encrypted);
          sendFallback = true;
        } else {
          Object.assign(payload, encrypted);
        }
      } catch (encErr) {
        console.error('Encryption failed:', encErr);
        sendFallback = true;
      }
    } else {
      sendFallback = true;
    }

    if (sendFallback) {
      payload.plainMessage = plaintext;
    }

    console.log('Sending message payload:', {
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      hasEncrypted: !!payload.encrypted_text,
      hasIV: !!payload.iv,
      hasAuthTag: !!payload.auth_tag,
      hasPlain: !!payload.plainMessage
    });

    try {
      const res = await axios.post(`${server}/messages`, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setMessages(prev => [...prev, {
          ...res.data.message,
          decrypted_text: plaintext
        }]);
        setNewMessage('');
        toast.success('Sent!');
      }
    } catch (e) {
      console.error('Send failed:', e.response?.data || e.message);
      toast.error('Send failed');
    }
  };

  if (!currentUser || loading) return <><Navbar /><div>Loading...</div></>;

  return (
    <>
      <Navbar />
      <div className="messages-page">
        <div className="online-bar">
          Online ({onlineFriends.length} active friends)
          {onlineFriends.map(f => (
            <button key={f.id} onClick={() => handleSelectFriend(f)}>{f.fullName?.split(' ')[0]}</button>
          ))}
        </div>

        <div className="chat-container">
          <div className="friends-list">
            {friends.map(friend => (
              <button key={friend.id} onClick={() => handleSelectFriend(friend)} className={selectedChat?.id === friend.id ? 'active' : ''}>
                {friend.fullName} {friend.isOnline && '●'}
              </button>
            ))}
          </div>

          <div className="chat-area">
            {selectedChat ? (
              <>
                <div className="chat-header">{selectedChat.fullName}</div>
                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={msg.sender_id === currentUser.id ? 'own' : 'other'}>
                      <div>{msg.decrypted_text || msg.message || 'Message could not be decrypted'}</div>
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
