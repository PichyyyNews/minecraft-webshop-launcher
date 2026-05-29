const Setting = require('../models/Setting');
const axios = require('axios');

const verifyTurnstile = async (req, res, next) => {
    try {
        // Fetch setting from database or use env variables
        const turnstileStatus = await Setting.findOne({ key: 'turnstileEnabled' });
        const turnstileSecret = await Setting.findOne({ key: 'turnstileSecretKey' });
        
        const isEnabled = turnstileStatus ? turnstileStatus.value === 'true' : false;
        const secretKey = turnstileSecret?.value || process.env.TURNSTILE_SECRET_KEY;

        // If turnstile is not enabled, skip verification
        if (!isEnabled) {
            return next();
        }

        // Token must be provided by the client
        const token = req.body.turnstileToken;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Please complete the captcha challenge (Turnstile token missing)'
            });
        }

        // Verify token with Cloudflare
        const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const clientIp = req.ip || req.connection?.remoteAddress || '';
        
        const response = await axios.post(url, {
            secret: secretKey || '1x0000000000000000000000000000000AA', // fallback to testing key if not set
            response: token,
            remoteip: clientIp
        });

        if (response.data && response.data.success) {
            return next();
        } else {
            console.warn('[Turnstile] Verification failed:', response.data['error-codes']);
            return res.status(400).json({
                success: false,
                message: 'Captcha verification failed. Please try again.'
            });
        }
    } catch (error) {
        console.error('[Turnstile] Verification error:', error.message);
        // During network failure, allow or block? Let's block for safety.
        return res.status(500).json({
            success: false,
            message: 'Internal server error verifying Captcha.'
        });
    }
};

module.exports = verifyTurnstile;
