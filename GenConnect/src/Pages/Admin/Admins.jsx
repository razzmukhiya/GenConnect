import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../Components/AdminNavbar';
import AdminSidebar from '../../Components/AdminSidebar';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import '../../Styles/Admins.css';

const Admins = () => {
  const navigate = useNavigate();
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'Admin',
    status: 'Active'
  });

  // Real data from database
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchAdmins(token);
  }, [navigate]);

  const fetchAdmins = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Transform backend data to match frontend format
        const formattedAdmins = data.admins.map(admin => ({
          id: admin.id,
          name: admin.fullName,
          email: admin.email,
          role: admin.role,
          status: admin.isActive ? 'Active' : 'Inactive'
        }));
        setAdmins(formattedAdmins);
      } else {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          navigate('/admin/login');
        } else {
          setError(data.message || 'Failed to load admins');
        }
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };


  const handleAddAdmin = () => {
    setShowAddPopup(true);
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
    setNewAdmin({
      name: '',
      email: '',
      role: 'Admin',
      status: 'Active'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAdmin((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the admins list
        fetchAdmins(token);
        handleClosePopup();
      } else {
        setError(data.message || 'Failed to create admin');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      setError('Network error. Please check your connection.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`http://localhost:8000/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the admins list
        fetchAdmins(token);
      } else {
        setError(data.message || 'Failed to delete admin');
      }
    } catch (err) {
      console.error('Error deleting admin:', err);
      setError('Network error. Please check your connection.');
    }
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
                <h1>Admins Management</h1>
                <p>Manage admin users and their permissions</p>
              </div>

              <div className="header-right">
                <div className="action-buttons">
                  <button className="action-btn" onClick={handleAddAdmin}>
                    <MdAdd /> Add Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading admins...</p>
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

            {/* Admins Table */}
            {!loading && !error && (
              <div className="admins-table-container">
                <table className="admins-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No admins found</td>
                      </tr>
                    ) : (
                      admins.map((admin) => (
                        <tr key={admin.id}>
                          <td>{admin.name}</td>
                          <td>{admin.email}</td>
                          <td>{admin.role}</td>
                          <td>
                            <span className={`status-badge ${admin.status.toLowerCase()}`}>
                              {admin.status}
                            </span>
                          </td>
                          <td>
                            <button className="action-btn-small">
                              <MdEdit />
                            </button>
                            <button 
                              className="action-btn-small delete"
                              onClick={() => handleDelete(admin.id)}
                            >
                              <MdDelete />
                            </button>
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

      {/* Add Admin Popup */}
      {showAddPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h2>Add New Admin</h2>
              <button className="close-btn" onClick={handleClosePopup}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-admin-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newAdmin.name}
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
                  value={newAdmin.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={newAdmin.role}
                  onChange={handleInputChange}
                >
                  <option value="Admin">Admin</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={newAdmin.status}
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
                  Add Admin
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
