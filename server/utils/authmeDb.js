const mysql = require('mysql2/promise');
const crypto = require('crypto');

let pool = null;

/**
 * Get or create a MySQL connection pool for AuthMe database.
 */
const getPool = () => {
    if (pool) return pool;

    const host = process.env.AUTHME_MYSQL_HOST || '127.0.0.1';
    const port = parseInt(process.env.AUTHME_MYSQL_PORT) || 3306;
    const user = process.env.AUTHME_MYSQL_USER || 'awawa';
    const password = process.env.AUTHME_MYSQL_PASSWORD || '';
    const database = process.env.AUTHME_MYSQL_DATABASE || 'cobblemon_kati';

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
        const tableName = process.env.AUTHME_MYSQL_TABLE || 'authme';

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
        const tableName = process.env.AUTHME_MYSQL_TABLE || 'authme';

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

module.exports = { registerAuthMeUser, changeAuthMePassword, hashPasswordAuthMe };
