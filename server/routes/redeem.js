const express = require('express');
const router = express.Router();
const {
    getRedeemCodes,
    createRedeemCode,
    updateRedeemCode,
    deleteRedeemCode,
    getRedemptionLogs,
    redeemCode
} = require('../controllers/redeemController');
const { protect, admin } = require('../middleware/authMiddleware');

// User redemption route
router.post('/', protect, redeemCode);

// Admin-only configuration routes
router.get('/admin/codes', protect, admin, getRedeemCodes);
router.post('/admin/codes', protect, admin, createRedeemCode);
router.put('/admin/codes/:id', protect, admin, updateRedeemCode);
router.delete('/admin/codes/:id', protect, admin, deleteRedeemCode);
router.get('/admin/logs', protect, admin, getRedemptionLogs);

module.exports = router;
