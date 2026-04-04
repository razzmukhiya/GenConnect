import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  MdDashboard,
  MdPeople,
  MdLogout,
  MdMenu,
  MdClose,
  MdAssessment,
  MdSupportAgent
} from 'react-icons/md';


import '../Styles/AdminSidebar.css';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);


  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <MdDashboard /> },
    { name: 'Admins', icon: <MdPeople />, path: '/admin/admins' },
    { name: 'Users', path: '/admin/users', icon: <MdPeople /> },
    { name: 'Reports', path: '/admin/reports', icon: <MdAssessment /> },
    { name: 'Supports', path: '/admin/supports', icon: <MdSupportAgent /> },
  ];



  const handleLogout = () => {
    // Clear admin authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    
    // Redirect to admin login page
    navigate('/admin/login');
  };


  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile/Tablet Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">

          
          <h2>GenConnect</h2>
          <h3>Admin Dashboard</h3>
          {/* <button
            className="sidebar-close"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            ×
          </button> */}
        </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.name} className="sidebar-menu-item">
              <Link
                to={item.path}
                className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.name}</span>
              </Link>
            </li>
          ))}
          <li className="sidebar-menu-item">
            <button
              onClick={handleLogout}
              className="sidebar-link logout-btn"
              style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
            >
              <span className="menu-icon"><MdLogout /></span>
              <span className="menu-text">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
      </div>
    </>
  );
};

export default AdminSidebar;
