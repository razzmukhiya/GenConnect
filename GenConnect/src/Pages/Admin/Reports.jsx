import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  MdPostAdd
} from 'react-icons/md';
import '../../Styles/Reports.css';

const Reports = () => {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
           const response = await fetch('http://localhost:8000/api/admin/reports', {headers: {'Authorization': `Bearer ${token}`,'Content-Type': 'application/json'}});

      if (!response.ok) {
        throw new Error('Failed to fetch reports data');
      }

      const result = await response.json();
      if (result.success) {
        setReportsData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load reports');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRestrictPost = async (postId, reason) => {
    if (!window.confirm(`Restrict this post?\nReason: ${reason}`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`http://localhost:8000/api/admin/posts/${postId}/restrict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'Admin restriction' })
      });
      if (res.ok) {
        alert('Post restricted successfully');
        fetchReportsData();
      } else {
        const data = await res.json();
        alert('Failed to restrict post: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleBanUser = async (userId, reason) => {
    if (!window.confirm(`Ban this user?\nReason: ${reason}`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`http://localhost:8000/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'Admin ban' })
      });
      if (res.ok) {
        alert('User banned successfully');
        fetchReportsData();
      } else {
        const data = await res.json();
        alert('Failed to ban user: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main">
          <AdminNavbar />
          <div className="reports-container">
            <div className="loading-spinner">Loading reports...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main">
          <AdminNavbar />
          <div className="reports-container">
            <div className="error-message">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportsData) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main">
          <AdminNavbar />
          <div className="reports-container">
            <div className="error-message">No data available</div>
          </div>
        </div>
      </div>
    );
  }

  const { statistics, topUsers, topPosts, recentPosts, userGrowth, postGrowth, reports } = reportsData;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar />
        <div className="reports-container">
          <div className="reports-header">
            <h1>Reports & Analytics</h1>
            <p>Comprehensive overview of platform activity and user engagement</p>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon users">
                <MdPeople />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics.totalUsers)}</h3>
                <p>Total Users</p>
                <span className="stat-change positive">+{statistics.newUsersThisWeek} this week</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon posts">
                <MdArticle />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics.totalPosts)}</h3>
                <p>Total Posts</p>
                <span className="stat-change positive">+{statistics.postsThisWeek} this week</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon likes">
                <MdThumbUp />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics.totalLikes)}</h3>
                <p>Total Likes</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon comments">
                <MdComment />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics.totalComments)}</h3>
                <p>Total Comments</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon messages">
                <MdMessage />
              </div>
              <div className="stat-info">
                <h3>{formatNumber(statistics.totalMessages)}</h3>
                <p>Total Messages</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon growth">
                <MdTrendingUp />
              </div>
              <div className="stat-info">
                <h3>{statistics.newUsersThisMonth}</h3>
                <p>New Users (30 days)</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <div className="chart-container">
              <h2>User Growth (Last 6 Months)</h2>
              <div className="growth-chart">
                {userGrowth.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${Math.max((item.count / Math.max(...userGrowth.map(g => g.count))) * 100, 10)}%` 
                      }}
                    ></div>
                    <span className="chart-label">{item.month}</span>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-container">
              <h2>Post Growth (Last 6 Months)</h2>
              <div className="growth-chart">
                {postGrowth.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div 
                      className="chart-bar post-bar" 
                      style={{ 
                        height: `${Math.max((item.count / Math.max(...postGrowth.map(g => g.count))) * 100, 10)}%` 
                      }}
                    ></div>
                    <span className="chart-label">{item.month}</span>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Users Section */}
          <div className="section-container">
            <h2>Top Active Users</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Posts</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.fullName} />
                            ) : (
                              <MdPerson />
                            )}
                          </div>
                          <span>{user.fullName}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge">{user.postCount}</span>
                      </td>
                      <td>
                        <Link to={`/profile/${user.id}`} className="view-btn">
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Posts Section */}
          <div className="section-container">
            <h2>Most Liked Posts</h2>
            <div className="posts-grid">
              {topPosts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-author">
                      <MdPerson />
                      <span>{post.author}</span>
                    </div>
                    <span className="post-date">{formatDate(post.created_at)}</span>
                  </div>
                  <div className="post-content">
                    <p>{post.content?.substring(0, 150)}{post.content?.length > 150 ? '...' : ''}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Post" className="post-image" />
                    )}
                  </div>
                  <div className="post-stats">
                    <span className="likes">
                      <MdThumbUp /> {post.likes_count} likes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Posts Section */}
          <div className="section-container">
            <h2>Recent Posts</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Content</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.author}</td>
                      <td className="content-cell">
                        {post.content?.substring(0, 100)}{post.content?.length > 100 ? '...' : ''}
                      </td>
                      <td>
                        <span className="badge likes-badge">{post.likes_count}</span>
                      </td>
                      <td>
                        <span className="badge comments-badge">{post.comments_count}</span>
                      </td>
                      <td>{formatDate(post.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Recent Reports Section */}
          <div className="section-container">
            <h2>Recent Reports ({reports.length})</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>#{report.id}</td>
                      <td>
                        <span className={`badge ${report.report_type === 'post' ? 'posts' : 'user'}-badge`}>
                          {report.report_type.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            <MdPerson />
                          </div>
                          <span>
                            {report.report_type === 'post' 
                              ? report.post_author_name || 'Unknown'
                              : report.target_user_name || 'Unknown'
                            }
                          </span>
                          {report.report_type === 'user' && report.target_user_id && (
                            <Link to={`/admin/users/${report.target_user_id}`} className="view-btn small">View</Link>
                          )}
                          {report.report_type === 'post' && report.post_author_id && (
                            <Link to={`/profile/${report.post_author_id}`} className="view-btn small">View Post</Link>
                          )}
                        </div>
                      </td>
                      <td>
                        <span>{report.reporter_name}</span>
                      </td>
                      <td className="content-cell" title={report.reason}>
                        {report.reason?.substring(0, 100)}{report.reason?.length > 100 ? '...' : ''}
                      </td>
                      <td>
                        <span className={`badge status-${report.status || 'pending'}`}>
                          {report.status || 'pending'}
                        </span>
                      </td>
                      <td>{formatDate(report.created_at)}</td>
                      <td>
                        {report.report_type === 'post' && (
                          <button className="action-btn-small restrict" onClick={() => handleRestrictPost(report.post_id, report.reason)}>
                            Restrict
                          </button>
                        )}
                        {report.report_type === 'user' && (
                          <button className="action-btn-small ban" onClick={() => handleBanUser(report.target_user_id, report.reason)}>
                            Ban User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="8" className="no-data">
                        No reports found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
