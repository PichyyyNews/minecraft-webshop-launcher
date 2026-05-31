const express = require('express');
const router = express.Router();
const {
    getLauncherConfig,
    getLauncherContent,
    getMinecraftVersions,
    getModLoaders,
    getModLoaderVersions,
    getModrinthCategories,
    searchModrinthMods,
} = require('../controllers/launcherController');

const {
    generateJoinToken,
    verifyJoinToken
} = require('../controllers/autologinController');

const { protect } = require('../middleware/authMiddleware');
const { checkLauncherVersion } = require('../middleware/launcherVersionMiddleware');

router.get('/config', getLauncherConfig);
router.get('/content', getLauncherContent);
router.get('/metadata/minecraft-versions', getMinecraftVersions);
router.get('/metadata/mod-loaders', getModLoaders);
router.get('/metadata/mod-loader-versions/:loader', getModLoaderVersions);
router.get('/modrinth/categories', getModrinthCategories);
router.get('/modrinth/search', searchModrinthMods);

// Auto-Login endpoints
router.post('/auto-login', checkLauncherVersion, protect, generateJoinToken);

module.exports = router;
