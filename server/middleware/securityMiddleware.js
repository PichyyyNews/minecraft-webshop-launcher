/**
 * Security middleware for input sanitization
 */

// Sanitize HTML entities to prevent XSS
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

// Sanitize MongoDB operators to prevent NoSQL injection
const sanitizeMongoQuery = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeMongoQuery(item));
    }

    const sanitized = {};
    for (const key in obj) {
        // Block MongoDB operators
        if (key.startsWith('$')) {
            continue; // Skip this key
        }

        if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitized[key] = sanitizeMongoQuery(obj[key]);
        } else {
            sanitized[key] = obj[key];
        }
    }
    return sanitized;
};

// Main sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeMongoQuery(req.query);
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeMongoQuery(req.body);
    }

    // Sanitize params
    if (req.params) {
        req.params = sanitizeMongoQuery(req.params);
    }

    next();
};

// Validate ObjectId format to prevent injection
const validateObjectId = (req, res, next) => {
    const idFields = ['id', 'userId', 'productId', 'ticketId'];

    for (const field of idFields) {
        const value = req.params[field] || req.body[field] || req.query[field];
        if (value && !/^[a-fA-F0-9]{24}$/.test(value)) {
            return res.status(400).json({
                message: 'Invalid ID format',
                error: 'INVALID_ID'
            });
        }
    }

    next();
};

module.exports = { sanitizeInput, validateObjectId, escapeHtml };
