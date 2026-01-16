const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.role === 'admin' && !decoded.id) {
                // Handle simple admin auth (env var password)
                req.user = { _id: 'admin', id: 'admin', role: 'admin', name: 'Admin', email: 'admin@system' };
            } else {
                const user = await User.findById(decoded.id).select('-password');

                if (!user) {
                    return res.status(401).json({ message: 'Not authorized, user not found' });
                }

                req.user = user;
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
