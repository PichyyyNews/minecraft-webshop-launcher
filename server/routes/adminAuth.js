const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin login
router.post('/login', async (req, res) => {
    const { password } = req.body;

    // Get admin password from environment variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1150';
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

    if (password === ADMIN_PASSWORD) {
        // Generate JWT token
        const token = jwt.sign(
            { role: 'admin', timestamp: Date.now() },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            message: 'Login successful'
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid password'
        });
    }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Verify token endpoint
router.post('/verify', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Token is valid' });
});

module.exports = router;
