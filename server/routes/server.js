const express = require('express');
const router = express.Router();
const util = require('minecraft-server-util');

// @desc    Ping a Minecraft server
// @route   GET /api/server/ping
// @access  Public (Protected by frontend admin check)
router.get('/ping', async (req, res) => {
    const { ip } = req.query;

    if (!ip) {
        return res.status(400).json({ message: 'IP address is required' });
    }

    try {
        // Split IP and port if provided (e.g., 'mc.example.com:25565')
        const [host, port] = ip.split(':');
        const options = {
            timeout: 5000, // timeout in milliseconds
            enableSRV: true // enable SRV record lookup
        };

        const result = await util.status(host, port ? parseInt(port) : 25565, options);
        res.json(result);
    } catch (error) {
        console.error('Ping error:', error);
        res.status(500).json({ message: 'Could not connect to server' });
    }
});

module.exports = router;
