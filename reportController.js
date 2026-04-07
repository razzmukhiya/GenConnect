const reportModel = require('../models/reportModel');

exports.createReport = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reporterId, reason } = req.body;

    if (!postId || !reporterId || !reason || reason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Post ID, reporter ID, and reason are required' });
    }

    const report = await reportModel.createReport(parseInt(postId), parseInt(reporterId), reason.trim());

    res.status(201).json({ 
      success: true, 
      message: 'Post reported successfully', 
      report 
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to report post' });
  }
};

exports.getAllPostReports = async (req, res) => {
  try {
    const reports = await reportModel.getAllReports();
    
    res.json({ 
      success: true, 
      reports 
    });
  } catch (error) {
    console.error('Get all post reports error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getReportsByPostId = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    const reports = await reportModel.getReportsByPostId(postId);
    
    res.json({ 
      success: true, 
      reports 
    });
  } catch (error) {
    console.error('Get reports by post ID error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

