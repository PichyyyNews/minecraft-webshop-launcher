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

router.get('/config', getLauncherConfig);
router.get('/content', getLauncherContent);
router.get('/metadata/minecraft-versions', getMinecraftVersions);
router.get('/metadata/mod-loaders', getModLoaders);
router.get('/metadata/mod-loader-versions/:loader', getModLoaderVersions);
router.get('/modrinth/categories', getModrinthCategories);
router.get('/modrinth/search', searchModrinthMods);

module.exports = router;
