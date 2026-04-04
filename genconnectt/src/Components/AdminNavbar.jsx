import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FiSearch } from 'react-icons/fi';
import '../Styles/AdminNavbar.css';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    // Load admin data from localStorage
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      setAdminData(JSON.parse(storedAdminData));
    }
  }, []);


  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
    // Handle search logic here
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {

    // Clear admin authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    
    // Redirect to admin login page
    navigate('/admin/login');
  };


  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-container">
        <div className="admin-navbar-left">
          <div className="admin-navbar-logo">
            <Link to="/admin/dashboard">GenConnect Admin</Link>
          </div>

          <div className="admin-navbar-search">
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
              {/* <button type="submit" className="search-btn">
                <FiSearch size={10} />
              </button> */}
            </form>
          </div>
        </div>

        <div className="admin-navbar-right">
          <div className="notification-icon">
            <button className="notification-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
              </svg>
              <span className="notification-badge">3</span>
            </button>
          </div>

          {/* <div className="admin-profile" onClick={toggleProfileDropdown}>
            <div className="profile-avatar">
              {getInitials(adminData?.fullName)}
            </div>
            <div className="profile-info">

              <div className="profile-name">{adminData?.fullName || 'Admin'}</div>
              <div className="profile-role">{adminData?.role || 'Administrator'}</div>
            </div>
            <div className={`profile-dropdown ${showProfileDropdown ? 'active' : ''}`}>
              <Link to="/admin/profile" className="dropdown-item">Profile</Link>
              <Link to="/admin/settings" className="dropdown-item">Settings</Link>
              <button onClick={handleLogout} className="dropdown-item logout-btn">Logout</button>
            </div>

          </div> */}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
