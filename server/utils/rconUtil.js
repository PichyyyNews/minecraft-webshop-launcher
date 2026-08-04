const util = require('minecraft-server-util');
const Setting = require('../models/Setting');
const RconLog = require('../models/RconLog');

let rconClient = null;
let isConnecting = false;

const { decrypt } = require('./encryption');

// Helper to get RCON settings
const getRconSettings = async () => {
    const settings = await Setting.find({ key: { $in: ['rconHost', 'rconPort', 'rconPassword'] } });
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    if (config.rconPassword) {
        config.rconPassword = decrypt(config.rconPassword);
    }
    return config;
};

const connectRcon = async () => {
    if (rconClient) return rconClient;
    if (isConnecting) {
        // Simple wait if already connecting
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (rconClient) return rconClient;
    }

    isConnecting = true;
    try {
        const config = await getRconSettings();
        if (!config.rconHost || !config.rconPassword) {
            throw new Error('RCON settings not configured');
        }

        const host = config.rconHost;
        const port = parseInt(config.rconPort) || 25575;
        const password = config.rconPassword;

        const client = new util.RCON();
        await client.connect(host, port);
        await client.login(password);

        rconClient = client;
        console.log('RCON Connected');

        // Handle unlikely disconnect events if supported or just let errors handle it
        client.on('error', (err) => {
            console.error('RCON Client Error:', err);
            rconClient = null;
        });

        return client;
    } catch (err) {
        rconClient = null;
        throw err;
    } finally {
        isConnecting = false;
    }
};

/**
 * Executes an RCON command and logs the result.
 * @param {string} command - The command to execute.
 * @param {string} senderName - The name of the sender (optional, defaults to 'System').
 * @returns {Promise<{response: string, log: object}>} - The RCON response and the created log entry.
 */
const executeRconCommand = async (command, senderName = 'System') => {
    if (!command) throw new Error('Command is required');

    let response = '';
    let success = false;

    // Retry logic (Try up to 2 times: existing connection -> new connection)
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const client = await connectRcon();
            response = await client.execute(command);
            success = true;
            break; // Success, exit loop
        } catch (error) {
            console.warn(`RCON Attempt ${attempt} failed: ${error.message}`);

            // Force reset client for next attempt
            if (rconClient) {
                try { rconClient.close(); } catch (e) { }
                rconClient = null;
            }

            if (attempt === 2) {
                // If last attempt failed, log the error
                try {
                    await RconLog.create({
                        command,
                        response: 'Error: ' + error.message,
                        sender: senderName
                    });
                } catch (logError) {
                    console.error('Logging Error:', logError);
                }
                throw error;
            }
        }
    }

    if (success) {
        try {
            const log = new RconLog({
                command,
                response,
                sender: senderName
            });
            await log.save();
        } catch (logError) {
            console.error('Logging Error:', logError);
        }
    }

    return { response };
};

/**
 * Checks if a player is online in-game via RCON list and AuthMe isLogged status
 * @param {string} username - The Minecraft username of the player
 * @returns {Promise<{online: boolean, cannotVerify: boolean}>}
 */
const checkPlayerOnline = async (username) => {
    if (!username) return { online: false, cannotVerify: true };

    let rconOnline = null;
    let authmeOnline = null;
    let rconClient = null;

    // 1. RCON check
    try {
        const config = await getRconSettings();
        if (config.rconHost && config.rconPassword) {
            const host = config.rconHost;
            const port = parseInt(config.rconPort) || 25575;
            const password = config.rconPassword;

            rconClient = new util.RCON();
            await rconClient.connect(host, port);
            await rconClient.login(password);

            const response = await rconClient.execute('list');
            const cleanResponse = response.replace(/§[0-9a-fk-or]/gi, '');
            const lowerResponse = cleanResponse.toLowerCase();
            const lowerUsername = username.toLowerCase();

            const parts = lowerResponse.split(':');
            const playerListStr = parts.length > 1 ? parts[1] : parts[0];
            const players = playerListStr.split(/[, \n]+/).map(p => p.trim()).filter(p => p);

            rconOnline = players.includes(lowerUsername);
        }
    } catch (error) {
        console.error('RCON Check Online Error:', error.message);
    } finally {
        if (rconClient) {
            try { await rconClient.close(); } catch (e) { }
        }
    }

    // 2. AuthMe MySQL check
    try {
        const { getPool, getTableName } = require('./authmeDb');
        const db = getPool();
        const tableName = getTableName();
        if (db) {
            const [rows] = await db.execute(
                `SELECT isLogged FROM \`${tableName}\` WHERE LOWER(username) = LOWER(?) LIMIT 1`,
                [username]
            );
            if (rows.length > 0) {
                authmeOnline = rows[0].isLogged === 1;
            }
        }
    } catch (error) {
        console.error('AuthMe Check Online Error:', error.message);
    }

    const hasRcon = rconOnline !== null;
    const hasAuthme = authmeOnline !== null;

    if (!hasRcon && !hasAuthme) {
        return { online: false, cannotVerify: true };
    }

    return {
        online: (rconOnline === true) || (authmeOnline === true),
        cannotVerify: false
    };
};

module.exports = { executeRconCommand, getRconSettings, checkPlayerOnline };
