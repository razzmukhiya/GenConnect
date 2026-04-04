import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { server } from '../../server.js';
import Navbar from '../Components/Navbar';
import '../Styles/Friends.css';


const Friends = () => {
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);


  // Get current user from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Fetch friend requests and friends when currentUser is available
  useEffect(() => {
    if (currentUser) {
      fetchFriendRequests();
      fetchFriends();
      fetchSuggestedUsers();
    }
  }, [currentUser]);

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${server}/friend-requests/${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        setFriendRequests(response.data.friendRequests);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${server}/friends/${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        setFriends(response.data.friends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Call the new suggested users endpoint
      const response = await axios.get(
        `${server}/users/suggested/${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        setPeopleYouMayKnow(response.data.users);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setLoading(false);
    }
  };


  const handleAccept = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${server}/friend-request/accept/${requestId}`,
        { userId: currentUser.id },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request accepted!');
        // Remove from friend requests and add to friends
        const acceptedRequest = friendRequests.find(r => r.id === requestId);
        setFriendRequests(friendRequests.filter(r => r.id !== requestId));
        
        // Refresh friends list
        fetchFriends();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error(error.response?.data?.message || 'Failed to accept friend request');
    }
  };

  const handleDecline = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${server}/friend-request/decline/${requestId}`,
        { userId: currentUser.id },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request declined');
        setFriendRequests(friendRequests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast.error(error.response?.data?.message || 'Failed to decline friend request');
    }
  };

  const handleAddFriend = async (receiverId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${server}/friend-request`,
        { 
          userId: currentUser.id,
          receiverId: receiverId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend request sent!');
        // Remove from suggestions and search results
        setPeopleYouMayKnow(peopleYouMayKnow.filter(u => u.id !== receiverId));
        setSearchResults(searchResults.filter(u => u.id !== receiverId));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error(error.response?.data?.message || 'Failed to send friend request');
    }
  };


  const handleRemoveFriend = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${server}/friends/${friendId}`,
        {
          data: { userId: currentUser.id },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        toast.success('Friend removed');
        setFriends(friends.filter(f => f.id !== friendId));
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error(error.response?.data?.message || 'Failed to remove friend');
    }
  };

  const handleMessage = (friendId) => {
    navigate('/messages', { state: { userId: friendId } });
  };

  const handleViewProfile = (friendId) => {
    navigate(`/profile/${friendId}`);
  };


  // Search functionality - search all users via API
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
    } else {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${server}/search?query=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { userId: currentUser.id }
          }
        );
        if (response.data.success) {
          setSearchResults(response.data.users);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    }
  };


  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="friends-container">
          <h1>Please login to view your friends</h1>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="friends-container">
          <h1>Loading...</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="friends-container">
        <h1>Friends</h1>

        {/* Search Bar */}
        <div className="friends-search-container">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="friends-search-input"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search Results Section */}
        {isSearching && (
          <div className="friends-section search-results-section">
            <h2>Search Results ({searchResults.length})</h2>
            {searchResults.length === 0 ? (
              <div className="search-no-results">
                No users found matching "{searchQuery}"
              </div>
            ) : (
              <div className="user-cards">
                {searchResults.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-avatar">
                      {user.fullName ? user.fullName.charAt(0) : '?'}
                    </div>
                    <div className="user-name">{user.fullName || 'Unknown User'}</div>
                    {/* <div className="user-info">{user.email || ''}</div> */}
                    <div className="card-actions">
                      <button 
                        className="btn btn-add" 
                        onClick={() => handleAddFriend(user.id)}
                      >
                        Add Friend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Friend Requests Section */}
        <div className="friends-section">
          <h2>Friend Requests ({friendRequests.length})</h2>
          {friendRequests.length === 0 ? (
            <p>No pending friend requests</p>
          ) : (
            <div className="user-cards">
              {friendRequests.map(request => (
                <div key={request.id} className="user-card">
                  <div className="user-avatar">
                    {request.senderName ? request.senderName.charAt(0) : '?'}
                  </div>
                  <div className="user-name">{request.senderName || 'Unknown User'}</div>
                  <div className="user-info">{request.senderEmail || ''}</div>
                  <div className="card-actions">
                    <button 
                      className="btn btn-accept" 
                      onClick={() => handleAccept(request.id)}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn btn-decline" 
                      onClick={() => handleDecline(request.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends List Section */}
        <div className="friends-section">
          <h2>Your Friends ({friends.length})</h2>
          {friends.length === 0 ? (
            <p>No friends yet</p>
          ) : (
            <div className="user-cards">
              {friends.map(friend => (
                <div 
                  key={friend.id} 
                  className="user-card friend-card"
                  onClick={() => handleViewProfile(friend.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar">
                    {friend.fullName ? friend.fullName.charAt(0) : '?'}
                  </div>
                  <div className="user-name">{friend.fullName || 'Unknown User'}</div>
                  {/* <div className="user-info">{friend.email || ''}</div> */}
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn btn-message" 
                      onClick={() => handleMessage(friend.id)}
                    >
                      Message
                    </button>
                    <button 
                      className="btn btn-decline" 
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* People You May Know Section */}
        <div className="friends-section">
          <h2>People You May Know ({peopleYouMayKnow.length})</h2>
          {peopleYouMayKnow.length === 0 ? (
            <p>No suggestions available</p>
          ) : (
            <div className="user-cards">
              {peopleYouMayKnow.map(user => (
                <div 
                  key={user.id} 
                  className="user-card"
                  onClick={() => handleViewProfile(user.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar">
                    {user.fullName ? user.fullName.charAt(0) : '?'}
                  </div>
                  <div className="user-name">{user.fullName || 'Unknown User'}</div>
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn btn-add" 
                      onClick={() => handleAddFriend(user.id)}
                    >
                      Add Friend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default Friends;
