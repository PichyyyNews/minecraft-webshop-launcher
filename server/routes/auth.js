const express = require('express');
const { register, login, getMe, resetUserPassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const verifyTurnstile = require('../middleware/turnstileMiddleware');
const { checkLauncherVersion } = require('../middleware/launcherVersionMiddleware');

const router = express.Router();

router.post('/register', verifyTurnstile, register);
router.post('/login', checkLauncherVersion, login);
router.get('/me', protect, getMe);
router.put('/reset-password/:userId', resetUserPassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
