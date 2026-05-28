const mysql = require('mysql2/promise');
const crypto = require('crypto');

let pool = null;
let savedConfig = null;

/**
 * Get or create a MySQL connection pool for AuthMe database.
 * Uses savedConfig (from MongoDB Settings) if available, else env vars.
 */
const getPool = () => {
    if (pool) return pool;

    const host = (savedConfig && savedConfig.host) || process.env.AUTHME_MYSQL_HOST || '127.0.0.1';
    const port = (savedConfig && parseInt(savedConfig.port)) || parseInt(process.env.AUTHME_MYSQL_PORT) || 3306;
    const user = (savedConfig && savedConfig.user) || process.env.AUTHME_MYSQL_USER || 'awawa';
    const password = (savedConfig && savedConfig.password) || process.env.AUTHME_MYSQL_PASSWORD || '';
    const database = (savedConfig && savedConfig.database) || process.env.AUTHME_MYSQL_DATABASE || 'cobblemon_kati';

    pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
    });

    console.log(`[AuthMe DB] MySQL pool created for ${host}:${port}/${database}`);
    return pool;
};

/**
 * Get the current AuthMe table name from savedConfig or env.
 */
const getTableName = () => {
    return (savedConfig && savedConfig.table) || process.env.AUTHME_MYSQL_TABLE || 'authme';
};

/**
 * Hash a password the same way AuthMe does with SHA256.
 * AuthMe SHA256 format: $SHA$<salt>$<hash>
 * where hash = sha256(sha256(password) + salt)
 */
const hashPasswordAuthMe = (password) => {
    // Generate a random 16-char hex salt
    const salt = crypto.randomBytes(8).toString('hex');

    // AuthMe SHA256: sha256( sha256(password) + salt )
    const firstHash = crypto.createHash('sha256').update(password).digest('hex');
    const finalHash = crypto.createHash('sha256').update(firstHash + salt).digest('hex');

    return `$SHA$${salt}$${finalHash}`;
};

/**
 * Register a user in the AuthMe MySQL database.
 * @param {string} username - The Minecraft username
 * @param {string} password - The plain text password
 * @param {string} ip - The user's IP address (optional)
 * @param {string} email - The user's email (optional)
 * @returns {Promise<{success: boolean, message: string}>}
 */
const registerAuthMeUser = async (username, password, ip = '127.0.0.1', email = 'your@email.com') => {
    try {
        const db = getPool();
        const tableName = getTableName();

        // Check if user already exists (case-insensitive)
        const [existing] = await db.execute(
            `SELECT username FROM \`${tableName}\` WHERE LOWER(username) = LOWER(?)`,
            [username]
        );

        if (existing.length > 0) {
            console.log(`[AuthMe DB] User "${username}" already exists in AuthMe, skipping.`);
            return { success: true, message: 'User already exists in AuthMe' };
        }

        // Hash the password in AuthMe's SHA256 format
        const hashedPassword = hashPasswordAuthMe(password);
        const now = Date.now();

        // Insert into AuthMe table
        await db.execute(
            `INSERT INTO \`${tableName}\` (username, realname, password, ip, email, regdate, regip, isLogged, hasSession, x, y, z, world, yaw, pitch)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'world', 0, 0)`,
            [username.toLowerCase(), username, hashedPassword, ip, email, now, ip]
        );

        console.log(`[AuthMe DB] Successfully registered user "${username}" in AuthMe database`);
        return { success: true, message: 'User registered in AuthMe' };
    } catch (error) {
        console.error(`[AuthMe DB] Failed to register user "${username}":`, error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Change a user's password in the AuthMe MySQL database.
 * @param {string} username - The Minecraft username
 * @param {string} newPassword - The new plain text password
 * @returns {Promise<{success: boolean, message: string}>}
 */
const changeAuthMePassword = async (username, newPassword) => {
    try {
        const db = getPool();
        const tableName = getTableName();

        const hashedPassword = hashPasswordAuthMe(newPassword);

        const [result] = await db.execute(
            `UPDATE \`${tableName}\` SET password = ? WHERE LOWER(username) = LOWER(?)`,
            [hashedPassword, username]
        );

        if (result.affectedRows === 0) {
            console.log(`[AuthMe DB] User "${username}" not found in AuthMe for password change`);
            return { success: false, message: 'User not found in AuthMe' };
        }

        console.log(`[AuthMe DB] Successfully changed password for "${username}" in AuthMe database`);
        return { success: true, message: 'Password changed in AuthMe' };
    } catch (error) {
        console.error(`[AuthMe DB] Failed to change password for "${username}":`, error.message);
        return { success: false, message: error.message };
    }
};

// =====================================================
// Admin functions
// =====================================================

/**
 * Returns the current AuthMe MySQL config (without password).
 */
const getAuthMeConfig = () => {
    return {
        host: (savedConfig && savedConfig.host) || process.env.AUTHME_MYSQL_HOST || '127.0.0.1',
        port: (savedConfig && parseInt(savedConfig.port)) || parseInt(process.env.AUTHME_MYSQL_PORT) || 3306,
        user: (savedConfig && savedConfig.user) || process.env.AUTHME_MYSQL_USER || 'awawa',
        database: (savedConfig && savedConfig.database) || process.env.AUTHME_MYSQL_DATABASE || 'cobblemon_kati',
        table: getTableName(),
    };
};

/**
 * Tests the MySQL connection and returns success/error.
 */
const testAuthMeConnection = async () => {
    try {
        const db = getPool();
        const [rows] = await db.execute('SELECT 1');
        return { success: true, message: 'Connection successful' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Gets paginated list of users from AuthMe table with search by username.
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @param {string} search - Search term for username
 * @returns {Promise<{users: Array, total: number}>}
 */
const getAuthMeUsers = async (page = 1, limit = 20, search = '') => {
    try {
        const db = getPool();
        const tableName = getTableName();
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [];

        if (search) {
            whereClause = 'WHERE LOWER(username) LIKE LOWER(?)';
            params.push(`%${search}%`);
        }

        // Get total count
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM \`${tableName}\` ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated users
        const queryParams = [...params, limit, offset];
        const [users] = await db.execute(
            `SELECT id, username, realname, ip, email, isLogged, hasSession, regdate, lastlogin FROM \`${tableName}\` ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            queryParams
        );

        return { users, total };
    } catch (error) {
        console.error('[AuthMe DB] Failed to get users:', error.message);
        throw error;
    }
};

/**
 * Deletes a user from the AuthMe table.
 * @param {string} username - The username to delete
 * @returns {Promise<{success: boolean, message: string}>}
 */
const deleteAuthMeUser = async (username) => {
    try {
        const db = getPool();
        const tableName = getTableName();

        const [result] = await db.execute(
            `DELETE FROM \`${tableName}\` WHERE LOWER(username) = LOWER(?)`,
            [username]
        );

        if (result.affectedRows === 0) {
            return { success: false, message: 'User not found in AuthMe' };
        }

        console.log(`[AuthMe DB] Deleted user "${username}" from AuthMe database`);
        return { success: true, message: 'User deleted from AuthMe' };
    } catch (error) {
        console.error(`[AuthMe DB] Failed to delete user "${username}":`, error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Returns stats: totalUsers, loggedInUsers, recentRegistrations (last 7 days).
 */
const getAuthMeStats = async () => {
    try {
        const db = getPool();
        const tableName = getTableName();

        const [totalResult] = await db.execute(
            `SELECT COUNT(*) as total FROM \`${tableName}\``
        );
        const totalUsers = totalResult[0].total;

        const [loggedInResult] = await db.execute(
            `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE isLogged = 1`
        );
        const loggedInUsers = loggedInResult[0].total;

        // regdate is stored as epoch milliseconds
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const [recentResult] = await db.execute(
            `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE regdate > ?`,
            [sevenDaysAgo]
        );
        const recentRegistrations = recentResult[0].total;

        return { totalUsers, loggedInUsers, recentRegistrations };
    } catch (error) {
        console.error('[AuthMe DB] Failed to get stats:', error.message);
        throw error;
    }
};

/**
 * Recreates the MySQL pool with new config. Saves to MongoDB Settings for persistence.
 * @param {Object} config - { host, port, user, password, database, table }
 */
const updateAuthMeConfig = async (config) => {
    const Setting = require('../models/Setting');

    // Destroy old pool
    if (pool) {
        try {
            await pool.end();
        } catch (e) {
            console.error('[AuthMe DB] Error closing old pool:', e.message);
        }
        pool = null;
    }

    // Update local savedConfig
    savedConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        table: config.table,
    };

    // Save each field to MongoDB Settings
    const settingsMap = {
        authme_mysql_host: config.host,
        authme_mysql_port: String(config.port),
        authme_mysql_user: config.user,
        authme_mysql_password: config.password,
        authme_mysql_database: config.database,
        authme_mysql_table: config.table,
    };

    for (const [key, value] of Object.entries(settingsMap)) {
        await Setting.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
    }

    // Create new pool with updated config
    getPool();

    console.log('[AuthMe DB] Config updated and saved to MongoDB Settings');
};

/**
 * On server startup, load saved AuthMe config from MongoDB Settings.
 * If settings exist, initialize the pool with them. Otherwise fall back to env vars.
 */
const initAuthMeFromSettings = async () => {
    try {
        const Setting = require('../models/Setting');

        const keys = [
            'authme_mysql_host',
            'authme_mysql_port',
            'authme_mysql_user',
            'authme_mysql_password',
            'authme_mysql_database',
            'authme_mysql_table',
        ];

        const settings = await Setting.find({ key: { $in: keys } });

        if (settings.length === 0) {
            console.log('[AuthMe DB] No saved settings found, using env vars');
            return;
        }

        const settingsMap = {};
        settings.forEach(s => settingsMap[s.key] = s.value);

        // Only apply if we have at least the host saved
        if (settingsMap.authme_mysql_host) {
            savedConfig = {
                host: settingsMap.authme_mysql_host,
                port: settingsMap.authme_mysql_port || '3306',
                user: settingsMap.authme_mysql_user || 'root',
                password: settingsMap.authme_mysql_password || '',
                database: settingsMap.authme_mysql_database || 'cobblemon_kati',
                table: settingsMap.authme_mysql_table || 'authme',
            };

            // Reset pool so it picks up new config on next getPool() call
            if (pool) {
                try { await pool.end(); } catch (e) { /* ignore */ }
                pool = null;
            }

            console.log(`[AuthMe DB] Loaded config from MongoDB Settings: ${savedConfig.host}:${savedConfig.port}/${savedConfig.database}`);
        } else {
            console.log('[AuthMe DB] Incomplete saved settings, using env vars');
        }
    } catch (error) {
        console.error('[AuthMe DB] Failed to load settings from MongoDB:', error.message);
    }
};

module.exports = {
    registerAuthMeUser,
    changeAuthMePassword,
    hashPasswordAuthMe,
    getAuthMeConfig,
    testAuthMeConnection,
    getAuthMeUsers,
    deleteAuthMeUser,
    getAuthMeStats,
    updateAuthMeConfig,
    initAuthMeFromSettings,
};
