const rateLimit = require('express-rate-limit');

// Check if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 5000 : 2000, // Increased to 2000 requests per 15 mins in production
    message: {
        message: 'Too many requests from this IP, please try again later.',
        error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 1000 : 500, // Increased to prevent false positives
    message: {
        message: 'Too many login attempts, please try again after an hour.',
        error: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 500 : 200, // Increased significantly for adding multiple products
    message: {
        message: 'Too many upload attempts, please try again later.',
        error: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
