const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getBackupStats,
    triggerBackup,
    getAuditLogs,
    getQuorumRequests,
    approveQuorumRequest,
    runSandboxTest
} = require('../controllers/backupController');

// All backup routes require authentication & admin/root access
router.use(protect);
router.use(admin);

router.get('/stats', getBackupStats);
router.post('/trigger', triggerBackup);
router.get('/audit-logs', getAuditLogs);
router.get('/quorum', getQuorumRequests);
router.post('/quorum/approve', approveQuorumRequest);
router.post('/verify-sandbox', runSandboxTest);

module.exports = router;
