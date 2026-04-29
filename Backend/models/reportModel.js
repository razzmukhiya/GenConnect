const pool = require("../db/connection");

exports.createPostReportsTable = async () => {
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS post_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_type ENUM('post', 'user') DEFAULT 'post',
      post_id INT NULL,
      target_user_id INT NULL,
      reporter_id INT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_report (report_type, post_id, target_user_id, reporter_id),
      INDEX idx_report_type (report_type),
      INDEX idx_status (status)
    )`);

    console.log("Post reports table created or already exists");
  } catch (err) {
    console.error("Create post_reports table error:", err);
    throw new Error("Create post_reports table failed: " + err.message);
  }
};

exports.createPostReport = async (postId, reporterId, reason) => {
  try {
    await exports.createPostReportsTable();

    // Check if already reported
    const [existingReport] = await pool.execute(
      'SELECT id FROM post_reports WHERE report_type = "post" AND post_id = ? AND reporter_id = ?',
      [postId, reporterId]
    );
    if (existingReport.length > 0) {
      throw new Error("You have already reported this post");
    }
    const [result] = await pool.execute(
      'INSERT INTO post_reports (report_type, post_id, reporter_id, reason) VALUES ("post", ?, ?, ?)',
      [postId, reporterId, reason]
    );

    console.log("Post report created successfully:", result);
    return { 
      id: result.insertId, 
      report_type: 'post',
      post_id: postId, 
      reporter_id: reporterId, 
      reason,
      created_at: new Date()
    };
  } catch (err) {
    console.error("Create post report error:", err);
    throw new Error("Create post report failed: " + err.message);
  }
};

exports.createUserReport = async (targetUserId, reporterId, reason) => {
  try {
    await exports.createPostReportsTable();

    // Check if already reported
    const [existingReport] = await pool.execute(
      'SELECT id FROM post_reports WHERE report_type = "user" AND target_user_id = ? AND reporter_id = ?',
      [targetUserId, reporterId]
    );
    if (existingReport.length > 0) {
      throw new Error("You have already reported this user");
    }
    const [result] = await pool.execute(
      'INSERT INTO post_reports (report_type, target_user_id, reporter_id, reason) VALUES ("user", ?, ?, ?)',
      [targetUserId, reporterId, reason]
    );

    console.log("User report created successfully:", result);
    return { 
      id: result.insertId, 
      report_type: 'user',
      target_user_id: targetUserId, 
      reporter_id: reporterId, 
      reason,
      created_at: new Date()
    };
  } catch (err) {
    console.error("Create user report error:", err);
    throw new Error("Create user report failed: " + err.message);
  }
};

exports.getAllReports = async () => {
  try {
    const [rows] = await pool.execute(`
      SELECT pr.*, 
             CASE WHEN pr.report_type = 'post' THEN p.content END as content,
             CASE WHEN pr.report_type = 'post' THEN p.user_id END as post_author_id,
             pr.target_user_id,
             CASE WHEN pr.report_type = 'post' THEN pa.fullName END as post_author_name,
             CASE WHEN pr.report_type = 'user' THEN tu.fullName END as target_user_name,
             tu.email as target_user_email,
             r.fullName as reporter_name,
             r.email as reporter_email
      FROM post_reports pr
      LEFT JOIN posts p ON pr.post_id = p.id AND pr.report_type = 'post'
      LEFT JOIN users tu ON pr.target_user_id = tu.id AND pr.report_type = 'user'
      LEFT JOIN users r ON pr.reporter_id = r.id
      LEFT JOIN users pa ON p.user_id = pa.id AND pr.report_type = 'post'
      ORDER BY pr.created_at DESC
    `);

    return rows;
  } catch (err) {
    console.error("Get all reports error:", err);
    throw new Error("Get all reports failed: " + err.message);
  }
};

exports.getReportsByPostId = async (postId) => {
  try {
    const [rows] = await pool.execute(`
      SELECT pr.*, u.fullName as reporter_name
      FROM post_reports pr
      LEFT JOIN users u ON pr.reporter_id = u.id
      WHERE pr.post_id = ?
      ORDER BY pr.created_at DESC
    `, [postId]);

    return rows;
  } catch (err) {
    console.error("Get reports by post ID error:", err);
    throw new Error("Get reports by post ID failed: " + err.message);
  }
};

