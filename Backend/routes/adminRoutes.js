const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');


// Public routes
router.post('/login', adminController.login);

// Protected routes (require admin authentication)
router.get('/dashboard-stats', authMiddleware, adminController.getDashboardStats);
router.get('/reports', authMiddleware, adminController.getReportsData);
router.get('/profile', authMiddleware, adminController.getAdminProfile);

router.put('/profile', authMiddleware, adminController.updateAdminProfile);
router.put('/change-password', authMiddleware, adminController.changePassword);

// Admin management routes (require authentication)
router.get('/admins', authMiddleware, adminController.getAllAdmins);
router.post('/admins', authMiddleware, adminController.createAdmin);
router.put('/admins/:id/status', authMiddleware, adminController.updateAdminStatus);
router.delete('/admins/:id', authMiddleware, adminController.deleteAdmin);

// User management routes
router.get('/users', authMiddleware, adminController.getAllUsers);
router.delete('/users/:id', authMiddleware, adminController.deleteUser);

module.exports = router;
