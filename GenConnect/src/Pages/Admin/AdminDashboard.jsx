import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../Components/AdminNavbar';
import AdminSidebar from '../../Components/AdminSidebar';
import { MdPeople, MdTrendingUp, MdMessage, MdPending } from 'react-icons/md';
import '../../Styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    // Fetch dashboard stats
    fetchDashboardStats(token);
  }, [navigate]);

  const fetchDashboardStats = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          navigate('/admin/login');
        } else {
          setError(data.message || 'Failed to load dashboard data');
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminNavbar />
      <AdminSidebar />
      <div className="admin-layout">
        <div className="admin-main-content">
          <div className="admin-dashboard">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading dashboard data...</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <p className="error-text">{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">
                  Retry
                </button>
              </div>
            ) : (
              <div className="dashboard-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon"><MdPeople /></div>
                    <div className="stat-info">
                      <h3>{stats?.totalUsers || 0}</h3>
                      <p>Total Users</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon"><MdTrendingUp /></div>
                    <div className="stat-info">
                      <h3>{stats?.totalPosts || 0}</h3>
                      <p>Total Posts</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon"><MdMessage /></div>
                    <div className="stat-info">
                      <h3>{stats?.totalMessages || 0}</h3>
                      <p>Total Messages</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon"><MdPending /></div>
                    <div className="stat-info">
                      <h3>{stats?.pendingFriendRequests || 0}</h3>
                      <p>Pending Requests</p>
                    </div>
                  </div>
                </div>

                <div className="dashboard-sections">
                  <div className="section-card">
                    <h3>Recent Users</h3>
                    {stats?.recentUsers?.length > 0 ? (
                      <ul className="recent-list">
                        {stats.recentUsers.map((user) => (
                          <li key={user.id} className="recent-item">
                            <span className="recent-name">{user.fullName}</span>
                            <span className="recent-email">{user.email}</span>
                            <span className="recent-date">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No recent users</p>
                    )}
                  </div>

                  <div className="section-card">
                    <h3>Recent Posts</h3>
                    {stats?.recentPosts?.length > 0 ? (
                      <ul className="recent-list">
                        {stats.recentPosts.map((post) => (
                          <li key={post.id} className="recent-item">
                            <span className="recent-author">{post.author}</span>
                            <span className="recent-content">
                              {post.content?.substring(0, 50)}
                              {post.content?.length > 50 ? '...' : ''}
                            </span>
                            <span className="recent-date">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No recent posts</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
