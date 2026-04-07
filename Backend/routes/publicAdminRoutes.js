const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// Public admin register (no auth)
router.post('/register', adminController.register);

module.exports = router;

