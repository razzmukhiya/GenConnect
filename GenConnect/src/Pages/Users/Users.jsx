import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../Components/AdminNavbar';
import AdminSidebar from '../../Components/AdminSidebar';
import { MdAdd, MdEdit, MdDelete, MdClose, MdAccountBalance, MdSwapHoriz, MdAccessTime, MdEmail, MdPerson, MdCheckCircle, MdCancel, MdVisibility } from 'react-icons/md';
import '../../Styles/Users.css';

const Users = () => {
  const navigate = useNavigate();
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'User',
    status: 'Active'
  });

  // Real data from database
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchUsers(token);
  }, [navigate]);

  const fetchUsers = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Transform backend data to match frontend format
        const formattedUsers = data.users.map(user => ({
          id: user.id,
          name: user.fullName,
          username: user.email.split('@')[0], // Generate username from email
          email: user.email,
          role: 'User', // Default role since backend doesn't have roles
          status: 'Active', // Default status
          joined: new Date(user.createdAt).toISOString().split('T')[0],
          lastLogin: 'Recently' // Placeholder - not tracked in current schema
        }));

        setUsers(formattedUsers);
      } else {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          navigate('/admin/login');
        } else {
          setError(data.message || 'Failed to load users');
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };


  const handleAddUser = () => {
    setShowAddPopup(true);
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
    setNewUser({
      name: '',
      email: '',
      role: 'User',
      status: 'Active'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the users list
        fetchUsers(token);
      } else {
        setError(data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Network error. Please check your connection.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Note: Creating users would need a separate API endpoint
    // For now, just close the popup
    handleClosePopup();
  };


  return (
    <div>
      <AdminNavbar />
      <AdminSidebar />

      <div className="admin-layout">
        <div className="admin-main-content">
          <div className="admin-dashboard">

            {/* Dashboard Header */}
            <div className="dashboard-header">
              <div className="header-left">
                <h1>Users Management</h1>
                <p>Manage user accounts and their permissions</p>
              </div>

              <div className="header-right">
                <div className="action-buttons">
                  <button className="action-btn" onClick={handleAddUser}>
                    <MdAdd /> Add User
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="error-container">
                <p className="error-text">{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">
                  Retry
                </button>
              </div>
            )}

            {/* Users Table */}
            {!loading && !error && (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>

                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="no-data">No users found</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-name-cell">
                              <MdPerson className="user-icon-small" />
                              <span>{user.name}</span>
                            </div>
                          </td>
                          <td>{user.username}</td>
                          <td>{user.role}</td>
                          <td>
                            <span className={`status-badge ${user.status.toLowerCase()}`}>
                              {user.status === 'Active' ? <MdCheckCircle /> : <MdCancel />}
                              {user.status}
                            </span>
                          </td>
                          <td>{user.joined}</td>
                          <td>{user.lastLogin}</td>
                          <td>
                            <div className="action-buttons-row">
                              <button className="action-btn-small preview">
                                <MdVisibility />
                              </button>
                              <button className="action-btn-small">
                                <MdEdit />
                              </button>
                              <button 
                                className="action-btn-small delete"
                                onClick={() => handleDelete(user.id)}
                              >
                                <MdDelete />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}

                  </tbody>
                </table>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Add User Popup */}
      {showAddPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h2>Add New User</h2>
              <button className="close-btn" onClick={handleClosePopup}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-user-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                >
                  <option value="User">User</option>
                </select>
              </div>


              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={newUser.status}
                  onChange={handleInputChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleClosePopup}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add User
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
