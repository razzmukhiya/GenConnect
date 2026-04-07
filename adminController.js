const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

// Admin Register (Public - no auth required) - NEW
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
    }

    const [existingAdmin] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    if (existingAdmin.length > 0) {
      return res.status(409).json({ success: false, message: 'Admin with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO admins (fullName, email, password, role, isActive) VALUES (?, ?, ?, 'admin', TRUE)`,
      [fullName, email, hashedPassword]
    );

    const [adminRows] = await db.execute('SELECT id, fullName, email, role, isActive FROM admins WHERE id = ?', [result.insertId]);
    const admin = adminRows[0];

    const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

    res.status(201).json({ success: true, message: 'Admin registered successfully', admin, token });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Existing functions unchanged
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [adminRows] = await db.execute('SELECT * FROM admins WHERE email = ? AND isActive = TRUE', [email]);

    if (adminRows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = adminRows[0];

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await db.execute('UPDATE admins SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

    const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

    const { password: _, ...adminData } = admin;
    
    res.json({ success: true, message: 'Login successful', admin: adminData, token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [usersResult] = await db.execute('SELECT COUNT(*) as totalUsers FROM users');
    const [activeUsersResult] = await db.execute('SELECT COUNT(*) as activeUsers FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [postsResult] = await db.execute('SELECT COUNT(*) as totalPosts FROM posts');
    const [messagesResult] = await db.execute('SELECT COUNT(*) as totalMessages FROM messages');
    const [friendRequestsResult] = await db.execute('SELECT COUNT(*) as totalFriendRequests FROM friend_requests WHERE status = "pending"');

    const [recentUsers] = await db.execute(`SELECT id, fullName, email, createdAt FROM users ORDER BY createdAt DESC LIMIT 5`);

    const [recentPosts] = await db.execute(`SELECT p.id, p.content, p.created_at, u.fullName as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 5`);

    const stats = {
      totalUsers: usersResult[0].totalUsers,
      activeUsers: activeUsersResult[0].activeUsers,
      totalPosts: postsResult[0].totalPosts,
      totalMessages: messagesResult[0].totalMessages,
      pendingFriendRequests: friendRequestsResult[0].totalFriendRequests,
      recentUsers,
      recentPosts
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.execute(`SELECT id, fullName, email, number, gender, createdAt FROM users ORDER BY createdAt DESC`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get All Admins
exports.getAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const [adminRows] = await db.execute(`SELECT id, fullName, email, role, isActive FROM admins WHERE id = ?`, [id]);
    if (adminRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, admin: adminRows[0] });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const [admins] = await db.execute(`SELECT id, fullName, email, role, isActive, lastLogin, createdAt FROM admins ORDER BY createdAt DESC`);
    res.json({ success: true, admins });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create New Admin (Super Admin only - protected)
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
    }

    const [existingAdmin] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    if (existingAdmin.length > 0) {
      return res.status(409).json({ success: false, message: 'Admin with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(`INSERT INTO admins (fullName, email, password, role) VALUES (?, ?, ?, ?)`, [fullName, email, hashedPassword, role || 'admin']);
    res.status(201).json({ success: true, message: 'Admin created successfully', adminId: result.insertId });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update Admin Status
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, isActive } = req.body;
    
    // Build update query with only provided fields
    const updates = [];
    const values = [];
    
    if (fullName !== undefined) {
      updates.push('fullName = ?');
      values.push(fullName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (password !== undefined && password.trim() !== '') {
      updates.push('password = ?');
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      values.push(hashedPassword);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(isActive);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE admins SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    const [result] = await db.execute(query, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    res.json({ success: true, message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM admins WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const [adminRows] = await db.execute(`SELECT id, fullName, email, role, avatar, isActive, lastLogin, createdAt FROM admins WHERE id = ?`, [adminId]);
    if (adminRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, admin: adminRows[0] });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { fullName, email, avatar } = req.body;
    const [result] = await db.execute(`UPDATE admins SET fullName = ?, email = ?, avatar = ? WHERE id = ?`, [fullName, email, avatar, adminId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Change Admin Password
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    const [adminRows] = await db.execute('SELECT password FROM admins WHERE id = ?', [adminId]);

    if (adminRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, adminRows[0].password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, adminId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Reports Data
exports.getReportsData = async (req, res) => {
  try {
    const [totalUsersResult] = await db.execute('SELECT COUNT(*) as count FROM users');
    const [newUsersWeekResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [newUsersMonthResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [totalPostsResult] = await db.execute('SELECT COUNT(*) as count FROM posts');
    const [postsWeekResult] = await db.execute('SELECT COUNT(*) as count FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [totalLikesResult] = await db.execute('SELECT COUNT(*) as count FROM post_likes');
    const [totalCommentsResult] = await db.execute('SELECT COUNT(*) as count FROM post_comments');
    const [totalMessagesResult] = await db.execute('SELECT COUNT(*) as count FROM messages');

    const [topUsers] = await db.execute(`SELECT u.id, u.fullName, u.email, u.avatar, COUNT(p.id) as postCount FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id ORDER BY postCount DESC LIMIT 10`);

    const [topPosts] = await db.execute(`SELECT p.id, p.content, p.image_url, p.likes_count, p.created_at, u.fullName as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.likes_count DESC LIMIT 10`);

    const [recentPosts] = await db.execute(`SELECT p.id, p.content, p.image_url, p.likes_count, p.comments_count, p.created_at, u.fullName as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 20`);

    const [userGrowth] = await db.execute(`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY month ASC`);

    const [postGrowth] = await db.execute(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC`);

    const reportsData = {
      statistics: {
        totalUsers: totalUsersResult[0].count,
        newUsersThisWeek: newUsersWeekResult[0].count,
        newUsersThisMonth: newUsersMonthResult[0].count,
        totalPosts: totalPostsResult[0].count,
        postsThisWeek: postsWeekResult[0].count,
        totalLikes: totalLikesResult[0].count,
        totalComments: totalCommentsResult[0].count,
        totalMessages: totalMessagesResult[0].count
      },
      topUsers,
      topPosts,
      recentPosts,
      userGrowth,
      postGrowth
    };

    res.json({ success: true, data: reportsData });
  } catch (error) {
    console.error('Get reports data error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

