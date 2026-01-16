const express = require('express');
const router = express.Router();
const { getAnalytics, getSlip2GoInfo } = require('../controllers/adminController');

// @route   GET api/admin/analytics
// @desc    Get dashboard analytics data
// @access  Public (should be protected in production)
router.get('/analytics', getAnalytics);

// @route   GET api/admin/slip2go/info
// @desc    Get Slip2Go account info
// @access  Protected
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/slip2go/info', protect, admin, getSlip2GoInfo);

module.exports = router;
