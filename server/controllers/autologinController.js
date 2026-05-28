const crypto = require('crypto');

// In-memory token store: Map<username, { token, expiresAt }>
const joinTokens = new Map();

// POST /api/launcher/auto-login
// Protected route (requires valid launcher session token)
const generateJoinToken = (req, res) => {
    try {
        const username = req.user.username || req.user.name; // Depending on how auth token stores it
        if (!username) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Generate a simple random token
        const token = crypto.randomBytes(16).toString('hex');
        
        // Token expires in 2 minutes
        const expiresAt = Date.now() + 2 * 60 * 1000;

        joinTokens.set(username.toLowerCase(), {
            token,
            expiresAt
        });

        // Clean up expired tokens periodically (every 5 mins)
        if (Math.random() < 0.1) {
            const now = Date.now();
            for (const [user, data] of joinTokens.entries()) {
                if (now > data.expiresAt) {
                    joinTokens.delete(user);
                }
            }
        }

        res.json({ success: true, message: 'Join token generated' });
    } catch (error) {
        console.error('Error generating join token:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/server/verify-login?username=...
// Public route but only returns boolean true/false
const verifyJoinToken = (req, res) => {
    try {
        const username = req.query.username;
        if (!username) {
            return res.json({ valid: false });
        }

        const usernameLower = username.toLowerCase();
        const data = joinTokens.get(usernameLower);

        if (!data) {
            return res.json({ valid: false });
        }

        if (Date.now() > data.expiresAt) {
            joinTokens.delete(usernameLower);
            return res.json({ valid: false });
        }

        // Token is valid! Consume it so it can't be used again
        joinTokens.delete(usernameLower);

        return res.json({ valid: true });
    } catch (error) {
        console.error('Error verifying join token:', error);
        res.json({ valid: false });
    }
};

module.exports = {
    generateJoinToken,
    verifyJoinToken
};
