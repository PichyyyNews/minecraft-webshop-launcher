const util = require('minecraft-server-util');
const Setting = require('../models/Setting');
const RconLog = require('../models/RconLog');

let rconClient = null;
let isConnecting = false;

// Helper to get RCON settings
const getRconSettings = async () => {
    const settings = await Setting.find({ key: { $in: ['rconHost', 'rconPort', 'rconPassword'] } });
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
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

module.exports = { executeRconCommand, getRconSettings };
