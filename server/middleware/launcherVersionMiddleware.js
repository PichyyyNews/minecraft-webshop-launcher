const LauncherConfig = require('../models/LauncherConfig');

const checkLauncherVersion = async (req, res, next) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const origin = req.headers['origin'] || '';
        
        // We consider it a launcher request if:
        // 1. It explicitly sends the x-launcher-version header
        // 2. The origin contains 'tauri'
        // 3. The path is specifically for the launcher (like /auto-login)
        const isLauncher = 
            req.headers['x-launcher-version'] || 
            origin.includes('tauri') || 
            req.path.includes('/auto-login');

        if (!isLauncher) {
            return next(); // Not a launcher, allow (e.g. web browser)
        }

        const config = await LauncherConfig.findOne({});
        if (!config || !config.minLauncherVersion) {
            return next();
        }

        const clientVersion = req.headers['x-launcher-version'];
        
        if (!clientVersion) {
            // It is an old launcher because it doesn't send the version header
            return res.status(426).json({ 
                message: 'Launcher ????????????????????????? ????????????????????????????????????? (Update Required)' 
            });
        }

        const vClient = clientVersion.split('.').map(Number);
        const vMin = config.minLauncherVersion.split('.').map(Number);
        
        for (let i = 0; i < Math.max(vClient.length, vMin.length); i++) {
            const c = vClient[i] || 0;
            const m = vMin[i] || 0;
            if (c > m) break; // Client is newer
            if (c < m) {
                return res.status(426).json({ 
                    message: \??????? Launcher ???????? \ ?????? ???????????!\ 
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('Error in checkLauncherVersion:', error);
        next();
    }
};

module.exports = { checkLauncherVersion };
