import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { server } from '../../server.js';
import '../Styles/Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Socket for notification badge
  useEffect(() => {
    if (user) {
      const newSocket = io(`${server.replace('/api', '')}`);
      setSocket(newSocket);

      newSocket.emit('join', user.id);

      const token = localStorage.getItem('token');
      const fetchUnreadCount = async () => {
        try {
          const response = await axios.get(`${server}/notifications/${user.id}/unread-count`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUnreadCount(response.data.unreadCount);
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };

      fetchUnreadCount();

      newSocket.on('newNotification', () => {
        fetchUnreadCount();
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">GenConnect</Link>
        </div>
        <div className={`navbar-toggle ${isOpen ? 'active' : ''}`} onClick={toggleMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <li className="navbar-item">
            <Link to="/" className="navbar-link" onClick={() => setIsOpen(false)}>Home</Link>
          </li>
          <li className="navbar-item">
            <Link to="/friends" className="navbar-link" onClick={() => setIsOpen(false)}>Friends</Link>
          </li>
          <li className="navbar-item">
            <Link to="/messages" className="navbar-link" onClick={() => setIsOpen(false)}>Messages</Link>
          </li>
          <li className="navbar-item">
            <Link to="/notifications" className="navbar-link relative" ref={notificationRef} onClick={() => setIsOpen(false)}>
              Notifications
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </li>
          {user ? (
            <>
              <li className="navbar-item user-dropdown-container">
                <span
                  className="navbar-link user-name"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  {user.fullName}
                </span>
                {showUserDropdown && (
                  <div className="user-dropdown">
                    <Link
                      to={`/profile/${user.id}`}
                      className="dropdown-item"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      Profile
                    </Link>
                    <button
                      className="dropdown-item logout-btn"
                      onClick={() => {
                        handleLogout();
                        setShowUserDropdown(false);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link to="/signup" className="navbar-link" onClick={() => setIsOpen(false)}>Signup</Link>
              </li>
              <li className="navbar-item">
                <Link to="/login" className="navbar-link" onClick={() => setIsOpen(false)}>Login</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

