import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../Components/AdminNavbar';
import AdminSidebar from '../../Components/AdminSidebar';
import {
  MdPeople, 
  MdArticle, 
  MdThumbUp, 
  MdComment, 
  MdMessage, 
  MdTrendingUp, 
  MdPerson,
  MdAnalytics
} from 'react-icons/md';
import '../../Styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();

      if (data.success) {
        setReportsData(data.data);
      } else {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          navigate('/admin/login');
        } else {
          setError(data.message || 'Failed to load dashboard data');
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <AdminSidebar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminNavbar />
        <AdminSidebar />
        <div className="error-container">
          <p className="error-text">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      </>
    );
  }

  const { statistics, topUsers, userGrowth } = reportsData || {};

  return (
    <>
      <AdminNavbar />
      <AdminSidebar />
      <div className="admin-main-content">
        <div className="admin-dashboard">
          <div className="dashboard-header">
            <h1>Admin Dashboard</h1>
            <p>Platform performance and user analytics</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">
                <MdPeople />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.totalUsers || 0)}</h3>
                <p>Total Users</p>
                <span className="stat-change positive">
                  +{formatNumber(statistics?.newUsersThisWeek || 0)} this week
                </span>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <MdArticle />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.totalPosts || 0)}</h3>
                <p>Total Posts</p>
                <span className="stat-change positive">
                  +{formatNumber(statistics?.postsThisWeek || 0)} this week
                </span>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <MdThumbUp />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.totalLikes || 0)}</h3>
                <p>Total Likes</p>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <MdComment />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.totalComments || 0)}</h3>
                <p>Total Comments</p>
              </div>
            </div>

            <div className="stat-card cyan">
              <div className="stat-icon">
                <MdMessage />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.totalMessages || 0)}</h3>
                <p>Total Messages</p>
              </div>
            </div>

            <div className="stat-card pink">
              <div className="stat-icon">
                <MdTrendingUp />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics?.newUsersThisMonth || 0)}</h3>
                <p>New Users (30d)</p>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            {/* Top Active Users */}
            <div className="section-card">
              <h3><MdPerson /> Top Active Users</h3>
              {topUsers && topUsers.length > 0 ? (
                <div className="users-table">
                  <div className="table-header">
                    <span>User</span>
                    <span>Posts</span>
                  </div>
                  {topUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="table-row">
                      <div className="user-info">
                        <div className="user-avatar-placeholder"></div>
                        <span>{user.fullName}</span>
                      </div>
                      <span className="post-count">{user.postCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No top users data</p>
              )}
            </div>

            {/* Growth Charts */}
            <div className="section-card">
              <h3><MdAnalytics /> User Growth</h3>
              <div className="growth-chart">
                {userGrowth && userGrowth.length > 0 ? (
                  userGrowth.map((item, index) => (
                    <div key={index} className="chart-bar-item">
                      <div 
                        className="chart-bar" 
                        style={{height: `${(item.count / Math.max(...userGrowth.map(g => g.count || 1))) * 80}%`}}
                      ></div>
                      <span className="chart-label">{item.month}</span>
                      <span className="chart-value">{item.count}</span>
                    </div>
                  ))
                ) : (
                  Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="chart-bar-item">
                      <div className="chart-bar" style={{height: `${Math.random() * 60 + 20}%`}}></div>
                      <span className="chart-label">Month {i+1}</span>
                      <span className="chart-value">0</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
