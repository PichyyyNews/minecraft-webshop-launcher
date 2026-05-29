const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');
const { verifyAdminToken, requireRoot, ALL_PERMISSIONS } = require('./adminAuth');

// All routes require root access
router.use(verifyAdminToken, requireRoot);

// ─── GET /api/admin-users ──────────────────────────────────────────────────────
// List all sub-admin users (root user not included)
router.get('/', async (req, res) => {
    try {
        const users = await AdminUser.find({}).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /api/admin-users ─────────────────────────────────────────────────────
// Create a new sub-admin user
router.post('/', async (req, res) => {
    try {
        const { username, password, permissions } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Check not root
        const ADMIN_ROOT_USER = (process.env.ADMIN_ROOT_USER || 'root').toLowerCase();
        if (username.toLowerCase() === ADMIN_ROOT_USER) {
            return res.status(400).json({ success: false, message: 'Cannot create an admin user with root username' });
        }

        const existing = await AdminUser.findOne({ username: username.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        // Validate permissions
        const validPerms = (permissions || ['dashboard']).filter(p => ALL_PERMISSIONS.includes(p));

        const adminUser = new AdminUser({
            username: username.toLowerCase(),
            password,
            permissions: validPerms,
        });

        await adminUser.save();

        res.status(201).json({
            success: true,
            user: { _id: adminUser._id, username: adminUser.username, permissions: adminUser.permissions, createdAt: adminUser.createdAt },
        });
    } catch (error) {
        console.error('[AdminUsers] Create error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PUT /api/admin-users/:id ──────────────────────────────────────────────────
// Update username, password, and/or permissions of a sub-admin user
router.put('/:id', async (req, res) => {
    try {
        const { username, password, permissions } = req.body;
        const adminUser = await AdminUser.findById(req.params.id);

        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }

        if (username) {
            const ADMIN_ROOT_USER = (process.env.ADMIN_ROOT_USER || 'root').toLowerCase();
            if (username.toLowerCase() === ADMIN_ROOT_USER) {
                return res.status(400).json({ success: false, message: 'Cannot use root as username' });
            }
            // Check uniqueness
            const conflict = await AdminUser.findOne({ username: username.toLowerCase(), _id: { $ne: req.params.id } });
            if (conflict) {
                return res.status(400).json({ success: false, message: 'Username already taken' });
            }
            adminUser.username = username.toLowerCase();
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            }
            adminUser.password = password; // pre-save hook hashes it
        }

        if (permissions !== undefined) {
            adminUser.permissions = permissions.filter(p => ALL_PERMISSIONS.includes(p));
        }

        await adminUser.save();

        res.json({
            success: true,
            user: { _id: adminUser._id, username: adminUser.username, permissions: adminUser.permissions, updatedAt: adminUser.updatedAt },
        });
    } catch (error) {
        console.error('[AdminUsers] Update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DELETE /api/admin-users/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const adminUser = await AdminUser.findById(req.params.id);
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        await adminUser.deleteOne();
        res.json({ success: true, message: 'Admin user deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
