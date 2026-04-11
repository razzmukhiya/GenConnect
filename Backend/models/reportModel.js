const pool = require("../db/connection");

exports.createPostReportsTable = async () => {
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS post_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      reporter_id INT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_post_report (post_id, reporter_id),
      INDEX idx_post_id (post_id),
      INDEX idx_status (status)
    )`);
    console.log("Post reports table created or already exists");
  } catch (err) {
    console.error("Create post_reports table error:", err);
    throw new Error("Create post_reports table failed: " + err.message);
  }
};

exports.createReport = async (postId, reporterId, reason) => {
  try {
    await exports.createPostReportsTable();

    // Check if already reported
    const [existingReport] = await pool.execute(
      'SELECT id FROM post_reports WHERE post_id = ? AND reporter_id = ?',
      [postId, reporterId]
    );

    if (existingReport.length > 0) {
      throw new Error("You have already reported this post");
    }

    const [result] = await pool.execute(
      'INSERT INTO post_reports (post_id, reporter_id, reason) VALUES (?, ?, ?)',
      [postId, reporterId, reason]
    );

    console.log("Report created successfully:", result);
    return { 
      id: result.insertId, 
      post_id: postId, 
      reporter_id: reporterId, 
      reason,
      created_at: new Date()
    };
  } catch (err) {
    console.error("Create report error:", err);
    throw new Error("Create report failed: " + err.message);
  }
};

exports.getAllReports = async () => {
  try {
    const [rows] = await pool.execute(`
      SELECT pr.*, p.content, p.user_id as post_author_id, 
             r.fullName as reporter_name, pa.fullName as post_author_name
      FROM post_reports pr
      LEFT JOIN posts p ON pr.post_id = p.id
      LEFT JOIN users r ON pr.reporter_id = r.id
      LEFT JOIN users pa ON p.user_id = pa.id
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

