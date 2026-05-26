const express = require('express');
const router = express.Router();
const { getAnalytics, getSlip2GoInfo } = require('../controllers/adminController');
const { updateLauncherConfig, uploadLauncherLogo, uploadLauncherFile, uploadLauncherPresetFile } = require('../controllers/launcherController');
const { upload, processImage } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// @route   GET api/admin/analytics
// @desc    Get dashboard analytics data
// @access  Public (should be protected in production)
router.get('/analytics', getAnalytics);

// @route   GET api/admin/slip2go/info
// @desc    Get Slip2Go account info
// @access  Protected
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/slip2go/info', protect, admin, getSlip2GoInfo);

router.put('/launcher/config', protect, admin, updateLauncherConfig);
router.post('/launcher/logo', protect, admin, uploadLimiter, upload.single('logo'), processImage('launcher'), uploadLauncherLogo);

const launcherUploadDir = path.join(__dirname, '..', 'uploads', 'launcher');
if (!fs.existsSync(launcherUploadDir)) {
    fs.mkdirSync(launcherUploadDir, { recursive: true });
}

const launcherFileUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, launcherUploadDir),
        filename: (req, file, cb) => {
            const safeName = file.originalname.replace(/[\/\\<>:"|?*]/g, '').replace(/\.\./g, '');
            cb(null, `${Date.now()}-${safeName}`);
        },
    }),
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const type = req.params.type;

        if (type === 'options' && ['.txt', '.json'].includes(ext)) return cb(null, true);
        if (type === 'resourcePack' && ext === '.zip') return cb(null, true);
        if (type === 'mod' && ext === '.jar') return cb(null, true);

        cb(new Error('Invalid launcher file type.'));
    },
});

router.post('/launcher/files/:type', protect, admin, uploadLimiter, launcherFileUpload.single('file'), uploadLauncherFile);
router.post('/launcher/preset-files/:type', protect, admin, uploadLimiter, launcherFileUpload.single('file'), uploadLauncherPresetFile);

module.exports = router;
