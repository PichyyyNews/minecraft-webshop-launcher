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
// @desc    Check if a player is online
router.post('/check-online', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    let rconClient = null;
    try {
        const config = await getRconSettings();
        if (!config.rconHost || !config.rconPassword) {
            return res.json({ online: false, message: 'RCON not configured' });
        }

        const host = config.rconHost;
        const port = parseInt(config.rconPort) || 25575;
        const password = config.rconPassword;

        rconClient = new util.RCON();
        await rconClient.connect(host, port);
        await rconClient.login(password);

        // Command 'list' usually returns "There are x/y players online: player1, player2"
        const response = await rconClient.execute('list');

        console.log(`[DEBUG] Check Online - User: ${username}, RCON Response: ${response}`);

        // Strip color codes (section sign + char)
        const cleanResponse = response.replace(/§[0-9a-fk-or]/gi, '');

        // Normalize to lowercase
        const lowerResponse = cleanResponse.toLowerCase();
        const lowerUsername = username.toLowerCase();

        // Robust check:
        // 1. Split by ':' to get the list part (if standard vanilla/spigot format)
        // 2. If no ':', use the whole string
        // 3. Split by ',' or space to get individual names
        // 4. Check for exact match

        const parts = lowerResponse.split(':');
        const playerListStr = parts.length > 1 ? parts[1] : parts[0];

        // Split by comma or whitespace, filter empty strings
        const players = playerListStr.split(/[, \n]+/).map(p => p.trim()).filter(p => p);

        const isOnline = players.includes(lowerUsername);

        console.log(`[DEBUG] Parsed Players: ${JSON.stringify(players)}, Is Online: ${isOnline}`);

        res.json({ online: isOnline, debug: { response, cleanResponse, players } });

    } catch (error) {
        console.error('Check Online Error:', error);
        res.status(500).json({ error: 'Failed to check online status' });
    } finally {
        if (rconClient) {
            try {
                await rconClient.close();
            } catch (e) { }
        }
    }
});

module.exports = router;
