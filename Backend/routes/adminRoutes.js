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
router.get('/admins/:id', authMiddleware, (req, res) => {
  // Single admin fetch for edit
  const id = req.params.id;
  db.execute(`SELECT id, fullName, email, role, isActive FROM admins WHERE id = ?`, [id])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }
      res.json({ success: true, admin: rows[0] });
    })
    .catch(err => {
      console.error('Get single admin error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    });
});
router.post('/admins', authMiddleware, adminController.createAdmin);
router.put('/admins/:id', authMiddleware, adminController.updateAdmin);
router.get('/admins/:id', authMiddleware, adminController.getAdmin);
router.delete('/admins/:id', authMiddleware, adminController.deleteAdmin);

// User management routes
router.get('/users', authMiddleware, adminController.getAllUsers);
router.delete('/users/:id', authMiddleware, adminController.deleteUser);

module.exports = router;
