const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');

const JWT_SECRET = () => process.env.JWT_SECRET || 'your-secret-key-change-this';

// All sidebar permission keys
const ALL_PERMISSIONS = [
    'dashboard', 'info', 'players', 'server', 'launcher',
    'console', 'wiki', 'tickets', 'packages', 'products',
    'users', 'transactions', 'payments', 'database', 'settings',
    'permissions',
];

// ─── Middleware ────────────────────────────────────────────────────────────────

const verifyAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET());
        req.adminUser = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Root-only middleware
const requireRoot = (req, res, next) => {
    if (!req.adminUser?.isRoot) {
        return res.status(403).json({ success: false, message: 'Root access required' });
    }
    next();
};

// In-memory store for failed login attempts: { [username]: { count: number, lockUntil: Date } }
const loginFailures = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

const verifyTurnstile = require('../middleware/turnstileMiddleware');

// ─── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', verifyTurnstile, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const lowerUsername = username.toLowerCase();

    // Check if user account is locked
    const failureRecord = loginFailures.get(lowerUsername);
    if (failureRecord && failureRecord.lockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((failureRecord.lockUntil - Date.now()) / (60 * 1000));
        return res.status(403).json({
            success: false,
            message: `Too many failed login attempts. This account is locked. Please try again in ${remainingMinutes} minutes.`
        });
    }

    const ADMIN_ROOT_USER = (process.env.ADMIN_ROOT_USER || 'root').toLowerCase();
    const ADMIN_ROOT_PASS = process.env.ADMIN_ROOT_PASS || process.env.ADMIN_PASSWORD || 'root';

    // Helper to increment failed attempt
    const recordFailure = () => {
        const now = Date.now();
        const record = loginFailures.get(lowerUsername) || { count: 0, lockUntil: 0 };
        record.count += 1;
        if (record.count >= MAX_FAILED_ATTEMPTS) {
            record.lockUntil = now + LOCK_TIME_MS;
        }
        loginFailures.set(lowerUsername, record);
    };

    // Helper to clear failure record on success
    const clearFailure = () => {
        loginFailures.delete(lowerUsername);
    };

    // ── Check root credentials first ─────────────────────────────────────────
    if (lowerUsername === ADMIN_ROOT_USER) {
        if (password === ADMIN_ROOT_PASS) {
            clearFailure();
            const token = jwt.sign(
                {
                    role: 'admin',
                    username: ADMIN_ROOT_USER,
                    isRoot: true,
                    permissions: ALL_PERMISSIONS,
                },
                JWT_SECRET(),
                { expiresIn: '24h' }
            );

            return res.json({
                success: true,
                token,
                username: ADMIN_ROOT_USER,
                isRoot: true,
                permissions: ALL_PERMISSIONS,
                message: 'Login successful',
            });
        } else {
            recordFailure();
            const record = loginFailures.get(lowerUsername);
            const remaining = MAX_FAILED_ATTEMPTS - record.count;
            const msg = remaining <= 0 
                ? `Too many failed login attempts. Account locked for 15 minutes.`
                : `Invalid username or password. (${remaining} attempts remaining)`;
            return res.status(401).json({ success: false, message: msg });
        }
    }

    // ── Check DB admin users ──────────────────────────────────────────────────
    try {
        const adminUser = await AdminUser.findOne({ username: lowerUsername });
        if (!adminUser) {
            recordFailure();
            const record = loginFailures.get(lowerUsername);
            const remaining = MAX_FAILED_ATTEMPTS - record.count;
            const msg = remaining <= 0 
                ? `Too many failed login attempts. Account locked for 15 minutes.`
                : `Invalid username or password.`;
            return res.status(401).json({ success: false, message: msg });
        }

        const isMatch = await adminUser.matchPassword(password);
        if (!isMatch) {
            recordFailure();
            const record = loginFailures.get(lowerUsername);
            const remaining = MAX_FAILED_ATTEMPTS - record.count;
            const msg = remaining <= 0 
                ? `Too many failed login attempts. Account locked for 15 minutes.`
                : `Invalid username or password. (${remaining} attempts remaining)`;
            return res.status(401).json({ success: false, message: msg });
        }

        clearFailure();
        const token = jwt.sign(
            {
                role: 'admin',
                username: adminUser.username,
                isRoot: false,
                permissions: adminUser.permissions,
            },
            JWT_SECRET(),
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            token,
            username: adminUser.username,
            isRoot: false,
            permissions: adminUser.permissions,
            message: 'Login successful',
        });
    } catch (error) {
        console.error('[AdminAuth] Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /verify ──────────────────────────────────────────────────────────────
router.post('/verify', verifyAdminToken, (req, res) => {
    res.json({
        success: true,
        username: req.adminUser.username,
        isRoot: req.adminUser.isRoot,
        permissions: req.adminUser.permissions,
    });
});

// ─── Export helpers ────────────────────────────────────────────────────────────
module.exports = router;
module.exports.verifyAdminToken = verifyAdminToken;
module.exports.requireRoot = requireRoot;
module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS;
