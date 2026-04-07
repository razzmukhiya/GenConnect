import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Styles/AdminRegister.css';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/admin/public/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store admin token and data in localStorage
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminData', JSON.stringify(data.admin));
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <div className="admin-register-container">
        <div className="admin-register-form">
          <h1 className="admin-register-title">Add New Admin</h1>
          <p className="admin-register-subtitle">Create new admin user</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter secure password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="admin-register-btn"
              disabled={loading}
            >
              {loading ? 'Adding Admin...' : 'Add Admin'}
            </button>
          </form>
          <div className="login-link">
            <p>Already have an account? <a href="/admin/login">Sign in</a></p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminRegister;

