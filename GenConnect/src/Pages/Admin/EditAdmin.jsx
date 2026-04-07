import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNavbar from '../../Components/AdminNavbar';
import AdminSidebar from '../../Components/AdminSidebar';
import '../../Styles/Admins.css'; // Reuse admins styling

const EditAdmin = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    role: 'admin',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmin();
  }, [id]);

  const fetchAdmin = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/admins/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAdminData({
          fullName: data.admin.fullName || '',
          email: data.admin.email || '',
          role: data.admin.role || 'admin',
          isActive: data.admin.isActive
        });
      } else {
        setError('Admin not found');
      }
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/admins/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminData)
      });

      const data = await response.json();
      if (data.success) {
        alert('Admin updated successfully');
        navigate('/admin/admins');
      } else {
        setError(data.message || 'Update failed');
      }
    } catch (err) {
      setError('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <AdminNavbar />
      <AdminSidebar />
      <div className="admin-layout">
        <div className="admin-main-content">
          <div className="page-header">
            <h1>Edit Admin</h1>
            <p>Update admin details</p>
          </div>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={adminData.fullName}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={adminData.email}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={adminData.role} onChange={handleChange} disabled={saving}>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={adminData.isActive}
                  onChange={handleChange}
                />
                Active
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Update Admin'}
              </button>
              <button type="button" onClick={() => navigate('/admin/admins')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditAdmin;

