const express = require('express');
const router = express.Router();
const util = require('minecraft-server-util');
const Setting = require('../models/Setting');
const RconLog = require('../models/RconLog');

const { executeRconCommand, getRconSettings } = require('../utils/rconUtil');

// @route   POST /api/rcon/command
// @desc    Send RCON command and log it
router.post('/command', async (req, res) => {
    const { command, senderName } = req.body;

    try {
        const result = await executeRconCommand(command, senderName || 'Admin');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to execute command: ' + error.message });
    }
});

// @route   GET /api/rcon/logs
// @desc    Get recent RCON logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await RconLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs.reverse()); // Return oldest to newest for display
    } catch (error) {
        console.error('Fetch Logs Error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// @route   GET /api/rcon/status
// @desc    Get server status via RCON (or Ping as fallback)
router.get('/status', async (req, res) => {
    try {
        const config = await getRconSettings();

        if (!config.rconHost) {
            return res.status(400).json({ error: 'RCON Host not configured' });
        }

        const host = config.rconHost;
        const port = parseInt(config.rconPort) || 25575;

        // Try to ping first as it's lighter
        const status = await util.status(host, port);

        res.json(status);
    } catch (error) {
        console.error('Status Error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// @route   POST /api/rcon/check-online
// @desc    Check if a player is online via RCON + AuthMe dual verification
router.post('/check-online', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    let rconClient = null;
    let rconOnline = null;
    let authmeOnline = null;
    let rconError = null;
    let authmeError = null;

    // ─── 1. RCON check ────────────────────────────────────────────────────────
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
            console.log(`[DEBUG] Check Online - User: ${username}, RCON Response: ${response}`);

            const cleanResponse = response.replace(/§[0-9a-fk-or]/gi, '');
            const lowerResponse = cleanResponse.toLowerCase();
            const lowerUsername = username.toLowerCase();

            const parts = lowerResponse.split(':');
            const playerListStr = parts.length > 1 ? parts[1] : parts[0];
            const players = playerListStr.split(/[, \n]+/).map(p => p.trim()).filter(p => p);

            rconOnline = players.includes(lowerUsername);
            console.log(`[DEBUG] RCON Parsed Players: ${JSON.stringify(players)}, Is Online: ${rconOnline}`);
        } else {
            rconError = 'RCON not configured';
        }
    } catch (error) {
        console.error('[Check Online] RCON Error:', error.message);
        rconError = error.message;
    } finally {
        if (rconClient) {
            try { await rconClient.close(); } catch (e) { }
        }
    }

    // ─── 2. AuthMe MySQL check ─────────────────────────────────────────────────
    try {
        const { getPool, getTableName } = require('../utils/authmeDb');
        const db = getPool();
        const tableName = getTableName();

        const [rows] = await db.execute(
            `SELECT isLogged FROM \`${tableName}\` WHERE LOWER(username) = LOWER(?) LIMIT 1`,
            [username]
        );

        if (rows.length > 0) {
            authmeOnline = rows[0].isLogged === 1;
        } else {
            authmeOnline = null; // user not found in authme
        }
        console.log(`[DEBUG] AuthMe isLogged for "${username}": ${authmeOnline}`);
    } catch (error) {
        console.error('[Check Online] AuthMe Error:', error.message);
        authmeError = error.message;
    }

    // ─── 3. Decision logic ─────────────────────────────────────────────────────
    // If either method confirms online → online
    // If both say offline → offline
    // If both unavailable → cannotVerify: true

    const hasRcon = rconOnline !== null;
    const hasAuthme = authmeOnline !== null;

    let online = false;
    let cannotVerify = false;

    if (!hasRcon && !hasAuthme) {
        cannotVerify = true;
    } else {
        online = (rconOnline === true) || (authmeOnline === true);
    }

    res.json({
        online,
        cannotVerify,
        rcon: { checked: hasRcon, online: rconOnline, error: rconError },
        authme: { checked: hasAuthme, online: authmeOnline, error: authmeError },
    });
});

module.exports = router;
