const User = require('../models/User');
const {
    getAuthMeConfig: getConfig,
    testAuthMeConnection: testConnection,
    getAuthMeUsers: getUsers,
    deleteAuthMeUser: deleteUser,
    getAuthMeStats,
    updateAuthMeConfig: updateConfig,
    registerAuthMeUser,
} = require('../utils/authmeDb');

const getAuthMeConfig = async (req, res) => {
    try {
        const config = getConfig();
        let stats = null;
        try {
            stats = await getAuthMeStats();
        } catch (e) {
            stats = { totalUsers: 0, loggedInUsers: 0, recentRegistrations: 0, error: e.message };
        }
        res.json({ config, stats });
    } catch (error) {
        console.error('AuthMe Config Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateAuthMeConfig = async (req, res) => {
    try {
        const { host, port, user, password, database, table } = req.body;
        if (!host || !user || !database || !table) {
            return res.status(400).json({ message: 'Missing required fields: host, user, database, table' });
        }
        await updateConfig({ host, port: port || 3306, user, password: password || '', database, table });
        res.json({ message: 'AuthMe config updated successfully' });
    } catch (error) {
        console.error('AuthMe Update Config Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const testAuthMeConnection = async (req, res) => {
    try {
        const result = await testConnection();
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('AuthMe Test Connection Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getAuthMeUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const result = await getUsers(page, limit, search);
        res.json(result);
    } catch (error) {
        console.error('AuthMe Get Users Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteAuthMeUser = async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        const result = await deleteUser(username);
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('AuthMe Delete User Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const syncAuthMeUsers = async (req, res) => {
    try {
        const users = await User.find({});
        let synced = 0;
        let skipped = 0;
        let failed = 0;
        for (const user of users) {
            try {
                const result = await registerAuthMeUser(
                    user.name,
                    `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    '127.0.0.1',
                    user.email
                );
                if (result.success && result.message === 'User registered in AuthMe') {
                    synced++;
                } else if (result.success && result.message === 'User already exists in AuthMe') {
                    skipped++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }
        res.json({ synced, skipped, failed, total: users.length });
    } catch (error) {
        console.error('AuthMe Sync Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAuthMeConfig,
    updateAuthMeConfig,
    testAuthMeConnection,
    getAuthMeUsers,
    deleteAuthMeUser,
    syncAuthMeUsers,
};
