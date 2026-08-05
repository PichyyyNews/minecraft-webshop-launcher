const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getBackupStats,
    getBackupSettings,
    updateBackupSettings,
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
router.get('/settings', getBackupSettings);
router.post('/settings', updateBackupSettings);
router.post('/trigger', triggerBackup);
router.get('/audit-logs', getAuditLogs);
router.get('/quorum', getQuorumRequests);
router.post('/quorum/approve', approveQuorumRequest);
router.post('/verify-sandbox', runSandboxTest);

module.exports = router;
