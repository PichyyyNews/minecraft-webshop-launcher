const LauncherConfig = require('../models/LauncherConfig');
const Setting = require('../models/Setting');
const Card = require('../models/Card');
const Wiki = require('../models/Wiki');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const MODRINTH_API = 'https://api.modrinth.com/v2';
const MODRINTH_HEADERS = {
    'User-Agent': 'mc-webshop-launcher/0.1.0 (admin-managed-mods)',
};

const DEFAULT_CONFIG = {
    appName: 'MC Launcher',
    headline: 'พร้อมเข้าเซิร์ฟเวอร์',
    description: 'Launcher service แยกสำหรับเชื่อมระบบเว็บช็อปกับตัวเกม Minecraft',
    serverName: 'Survival Network',
    serverAddress: 'play.example.com',
    serverPort: '25565',
    installType: 'vanilla',
    installFolderName: 'minecraft-client',
    minecraftVersion: '1.21.8',
    loaderType: 'Vanilla',
    modLoaderVersion: '',
    optionsFileUrl: '',
    resourcePackUrl: '',
    mods: [],
    resourcePacks: [],
    minMemoryMb: 2048,
    maxMemoryMb: 4096,
    newsTitle: 'Welcome',
    newsBody: 'อัปเดตข่าวสาร launcher ได้จากหน้า admin',
    primaryColor: '#8fde5d',
    backgroundUrl: '',
    logoUrl: '',
    maintenanceMode: false,
    maintenanceMessage: 'Launcher is under maintenance.',
};

const getOrCreateLauncherConfig = async () => {
    let config = await LauncherConfig.findOne({});

    if (!config) {
        config = await LauncherConfig.create(DEFAULT_CONFIG);
    }

    return config;
};

const normalizeLoader = (loader) => String(loader || '').toLowerCase();

const formatCategoryName = (name) => String(name || '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sanitizeProjectFile = (mod, minecraftVersion, loader, projectType = 'mod') => {
    const normalizedLoader = normalizeLoader(loader);
    if (!mod || !mod.projectId || !mod.slug || !mod.versionId || !mod.fileUrl || !mod.fileName) {
        return null;
    }

    if (mod.minecraftVersion !== minecraftVersion) {
        return null;
    }

    if (projectType === 'mod' && normalizeLoader(mod.loader) !== normalizedLoader) {
        return null;
    }

    return {
        projectId: String(mod.projectId),
        slug: String(mod.slug),
        title: String(mod.title || mod.slug),
        description: String(mod.description || ''),
        iconUrl: String(mod.iconUrl || ''),
        author: String(mod.author || ''),
        minecraftVersion,
        loader: projectType === 'mod' ? normalizedLoader : 'resourcepack',
        versionId: String(mod.versionId),
        versionNumber: String(mod.versionNumber || ''),
        fileName: String(mod.fileName),
        fileUrl: String(mod.fileUrl),
        fileSize: Number(mod.fileSize || 0),
        sha1: String(mod.sha1 || ''),
    };
};

const sanitizeMods = (mods, installType, minecraftVersion, loaderType) => {
    if (installType !== 'modded' || !Array.isArray(mods)) {
        return [];
    }

    const seen = new Set();
    return mods
        .map(mod => sanitizeProjectFile(mod, minecraftVersion, loaderType, 'mod'))
        .filter(Boolean)
        .filter(mod => {
            if (seen.has(mod.projectId)) return false;
            seen.add(mod.projectId);
            return true;
        });
};

const sanitizeResourcePacks = (resourcePacks, minecraftVersion) => {
    if (!Array.isArray(resourcePacks)) {
        return [];
    }

    const seen = new Set();
    return resourcePacks
        .map(resourcePack => sanitizeProjectFile(resourcePack, minecraftVersion, 'resourcepack', 'resourcepack'))
        .filter(Boolean)
        .filter(mod => {
            if (seen.has(mod.projectId)) return false;
            seen.add(mod.projectId);
            return true;
        });
};

const sanitizeConfigPayload = (payload) => {
    const installType = payload.installType === 'modded' ? 'modded' : 'vanilla';
    const minecraftVersion = payload.minecraftVersion || DEFAULT_CONFIG.minecraftVersion;
    const loaderType = installType === 'modded' ? payload.loaderType : 'Vanilla';
    const modLoaderVersion = installType === 'modded' ? String(payload.modLoaderVersion || '').trim() : '';

    return {
        appName: payload.appName,
        headline: payload.headline,
        primaryColor: payload.primaryColor,
        logoUrl: payload.logoUrl,
        installType,
        installFolderName: payload.installFolderName || DEFAULT_CONFIG.installFolderName,
        minecraftVersion,
        loaderType,
        modLoaderVersion,
        optionsFileUrl: payload.optionsFileUrl,
        configFileUrl: payload.configFileUrl,
        resourcePackUrl: payload.resourcePackUrl,
        minLauncherVersion: payload.minLauncherVersion,
        latestLauncherVersion: payload.latestLauncherVersion,
        launcherUpdateUrl: payload.launcherUpdateUrl,
        launcherUpdateNotes: payload.launcherUpdateNotes,
        overwriteSettingsOnLaunch: payload.overwriteSettingsOnLaunch !== undefined ? payload.overwriteSettingsOnLaunch : true,
        mods: sanitizeMods(payload.mods, installType, minecraftVersion, loaderType),
        resourcePacks: sanitizeResourcePacks(payload.resourcePacks, minecraftVersion),
    };
};

const validateLauncherConfig = (updates) => {
    if (updates.installType !== 'modded') return null;

    if (!updates.loaderType || updates.loaderType === 'Vanilla') {
        return 'Select a mod loader before saving a modded launcher preset.';
    }

    if (!updates.modLoaderVersion) {
        return 'Select a mod loader version before saving a modded launcher preset.';
    }

    return null;
};

const getCompatibleProjectVersion = async (projectId, minecraftVersion, loader, projectType = 'mod') => {
    const params = {
        game_versions: JSON.stringify([minecraftVersion]),
    };
    if (projectType === 'mod') {
        params.loaders = JSON.stringify([normalizeLoader(loader)]);
    }

    const response = await axios.get(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version`, {
        headers: MODRINTH_HEADERS,
        timeout: 12000,
        params,
    });

    const version = response.data.find(item => item.files && item.files.length > 0);
    if (!version) return null;

    const primaryFile = version.files.find(file => file.primary) || version.files[0];
    if (!primaryFile?.url || !primaryFile?.filename) return null;

    return {
        versionId: version.id,
        versionNumber: version.version_number,
        fileName: primaryFile.filename,
        fileUrl: primaryFile.url,
        fileSize: primaryFile.size || 0,
        sha1: primaryFile.hashes?.sha1 || '',
    };
};

const getModrinthCategories = async (req, res) => {
    try {
        const projectType = req.query.projectType === 'resourcepack' ? 'resourcepack' : 'mod';
        const response = await axios.get(`${MODRINTH_API}/tag/category`, {
            headers: MODRINTH_HEADERS,
            timeout: 10000,
        });
        const loaderCategories = new Set(['fabric', 'forge', 'quilt', 'neoforge', 'liteloader', 'rift', 'modloader']);
        const categories = response.data
            .filter(category => category.project_type === projectType && !loaderCategories.has(category.name))
            .map(category => ({
                name: category.name,
                displayName: formatCategoryName(category.name),
                icon: category.icon || '',
            }));

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load Modrinth categories' });
    }
};

const isVersionOld = (current, minRequired) => {
    if (!current) return true;
    const c = current.split('.').map(Number);
    const m = (minRequired || '0.1.1').split('.').map(Number);
    for (let i = 0; i < Math.max(c.length, m.length); i++) {
        const cVal = c[i] || 0;
        const mVal = m[i] || 0;
        if (cVal < mVal) return true;
        if (cVal > mVal) return false;
    }
    return false;
};

const getLauncherConfig = async (req, res) => {
    try {
        const config = await getOrCreateLauncherConfig();
        
        // If the request doesn't come from the admin panel (source=admin), enforce version
        if (req.query.source !== 'admin') {
            const clientVersion = req.headers['x-launcher-version'] || '';
            const minRequired = config.minLauncherVersion || '0.1.1';
            
            if (isVersionOld(clientVersion, minRequired)) {
                return res.status(400).json({ 
                    message: `Please update your Launcher to version ${minRequired} or newer from pixel-kati.com`
                });
            }
        }
        
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load launcher config' });
    }
};

const updateLauncherConfig = async (req, res) => {
    try {
        const updates = sanitizeConfigPayload(req.body);
        const validationError = validateLauncherConfig(updates);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const config = await LauncherConfig.findOneAndUpdate(
            {},
            { $set: updates },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            message: 'Launcher config updated successfully',
            config,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update launcher config' });
    }
};

const uploadLauncherLogo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No logo uploaded.' });
    }

    try {
        const logoUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        const config = await LauncherConfig.findOneAndUpdate(
            {},
            { $set: { logoUrl } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            message: 'Launcher logo uploaded successfully',
            url: logoUrl,
            config,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload launcher logo' });
    }
};

const uploadLauncherFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fieldMap = {
        options: 'optionsFileUrl',
        resourcePack: 'resourcePackUrl',
        config: 'configFileUrl',
        updater: 'launcherUpdateUrl',
    };
    const fieldName = fieldMap[req.params.type];

    if (!fieldName) {
        return res.status(400).json({ message: 'Invalid launcher file type.' });
    }

    try {
        const fileUrl = `/uploads/launcher/${req.file.filename}`;
        const config = await LauncherConfig.findOneAndUpdate(
            {},
            { $set: { [fieldName]: fileUrl } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            message: 'Launcher file uploaded successfully',
            url: fileUrl,
            filename: path.basename(req.file.filename),
            config,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload launcher file' });
    }
};

const uploadLauncherPresetFile = async (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
        return res.status(400).json({ message: 'No preset files uploaded.' });
    }

    const type = req.params.type === 'resourcePack' ? 'resourcePack' : 'mod';
    const minecraftVersion = String(req.body.minecraftVersion || '').trim();
    const loader = String(req.body.loader || '').trim();

    if (!minecraftVersion) {
        return res.status(400).json({ message: 'Minecraft version is required.' });
    }

    if (type === 'mod' && (!loader || loader === 'Vanilla')) {
        return res.status(400).json({ message: 'Mod loader is required for custom mods.' });
    }

    const results = files.map((file, index) => {
        const fileUrl = `/uploads/launcher/${file.filename}`;
        const originalName = path.basename(file.originalname || file.filename);
        const title = originalName.replace(/\.[^/.]+$/, '') || file.filename;
        const projectId = `custom-${type}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

        let fileSha1 = '';
        try {
            if (file.path && fs.existsSync(file.path)) {
                const fileBuffer = fs.readFileSync(file.path);
                fileSha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
            }
        } catch (e) {
            console.error('Error calculating sha1 for', file.path, e);
        }

        return {
            projectId,
            slug: projectId,
            title,
            description: type === 'mod' ? 'Custom uploaded mod' : 'Custom uploaded resource pack',
            iconUrl: '',
            author: 'Admin upload',
            minecraftVersion,
            loader: type === 'mod' ? normalizeLoader(loader) : 'resourcepack',
            versionId: projectId,
            versionNumber: 'custom',
            fileName: file.filename,
            fileUrl,
            fileSize: file.size || 0,
            sha1: fileSha1,
        };
    });

    res.json(results);
};

const getLauncherContent = async (req, res) => {
    try {
        const [settings, cards, latestArticles] = await Promise.all([
            Setting.find({
                key: { $in: ['latestArticlesTitle', 'whyChooseUsTitle'] },
            }),
            Card.find({}).sort({ createdAt: -1 }).limit(8),
            Wiki.find({}).sort({ createdAt: -1 }).limit(8),
        ]);

        const settingsMap = {};
        settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });

        const config = await getOrCreateLauncherConfig();
        const clientVersion = req.headers['x-launcher-version'] || '';
        const minRequired = config.minLauncherVersion || '0.1.1';
        
        if (req.query.source !== 'admin' && isVersionOld(clientVersion, minRequired)) {
            // Return fake content for old launchers to force them to update
            return res.json({
                latestArticlesTitle: settingsMap.latestArticlesTitle || 'Latest Articles',
                whyChooseUsTitle: settingsMap.whyChooseUsTitle || 'Why Choose Us?',
                latestArticles: [],
                cards: [{
                    _id: 'update-required',
                    title: '⚠️ อัปเดต Launcher ด่วน!',
                    description: `Launcher ของคุณเป็นเวอร์ชันเก่า และไม่สามารถเข้าเกมได้แล้ว กรุณาดาวน์โหลดเวอร์ชันใหม่ (${minRequired}+) จากเว็บไซต์ pixel-kati.com`,
                    imageUrl: '',
                    color: '#ff3333'
                }],
            });
        }

        res.json({
            latestArticlesTitle: settingsMap.latestArticlesTitle || 'Latest Articles',
            whyChooseUsTitle: settingsMap.whyChooseUsTitle || 'Why Choose Us?',
            latestArticles,
            cards,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load launcher content' });
    }
};

const getMinecraftVersions = async (req, res) => {
    try {
        const response = await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', {
            timeout: 10000,
        });

        const versions = response.data.versions
            .filter(version => version.type === 'release')
            .map(version => ({
                id: version.id,
                type: version.type,
                releaseTime: version.releaseTime,
            }));

        res.json({
            latest: response.data.latest,
            versions,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load Minecraft versions' });
    }
};

const getModLoaders = async (req, res) => {
    res.json([
        { id: 'Fabric', name: 'Fabric' },
        { id: 'Forge', name: 'Forge' },
        { id: 'Quilt', name: 'Quilt' },
    ]);
};

const getModLoaderVersions = async (req, res) => {
    const loader = String(req.params.loader || '').toLowerCase();
    const minecraftVersion = req.query.minecraftVersion;

    if (!minecraftVersion) {
        return res.status(400).json({ message: 'minecraftVersion is required' });
    }

    try {
        if (loader === 'fabric') {
            const response = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${minecraftVersion}`, {
                timeout: 10000,
            });

            return res.json(response.data.map(item => ({
                id: item.loader.version,
                stable: item.loader.stable,
            })));
        }

        if (loader === 'quilt') {
            const response = await axios.get(`https://meta.quiltmc.org/v3/versions/loader/${minecraftVersion}`, {
                timeout: 10000,
            });

            return res.json(response.data.map(item => ({
                id: item.loader.version,
                stable: item.loader.stable,
            })));
        }

        if (loader === 'forge') {
            const response = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', {
                timeout: 10000,
            });

            const versions = Object.entries(response.data.promos)
                .filter(([key]) => key.startsWith(`${minecraftVersion}-`))
                .map(([key, value]) => ({
                    id: String(value),
                    channel: key.replace(`${minecraftVersion}-`, ''),
                }));

            return res.json(versions);
        }

        res.status(400).json({ message: 'Unsupported mod loader' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load mod loader versions' });
    }
};

const searchModrinthMods = async (req, res) => {
    const query = String(req.query.query || '').trim();
    const minecraftVersion = String(req.query.minecraftVersion || '').trim();
    const loader = String(req.query.loader || '').trim();
    const category = String(req.query.category || '').trim();
    const projectType = req.query.projectType === 'resourcepack' ? 'resourcepack' : 'mod';

    if (!minecraftVersion || (projectType === 'mod' && (!loader || loader === 'Vanilla'))) {
        return res.status(400).json({ message: 'minecraftVersion and mod loader are required' });
    }

    try {
        const facets = [
            [`project_type:${projectType}`],
            [`versions:${minecraftVersion}`],
        ];
        if (projectType === 'mod') {
            facets.push([`categories:${normalizeLoader(loader)}`]);
        }
        if (category) {
            facets.push([`categories:${category}`]);
        }

        const response = await axios.get(`${MODRINTH_API}/search`, {
            headers: MODRINTH_HEADERS,
            timeout: 12000,
            params: {
                ...(query ? { query } : {}),
                facets: JSON.stringify(facets),
                index: 'downloads',
                limit: 12,
            },
        });

        const results = await Promise.all(
            (response.data.hits || []).map(async (hit) => {
                const compatibleVersion = await getCompatibleProjectVersion(hit.project_id, minecraftVersion, loader, projectType).catch(() => null);
                if (!compatibleVersion) return null;

                return {
                    projectId: hit.project_id,
                    slug: hit.slug,
                    title: hit.title,
                    description: hit.description,
                    iconUrl: hit.icon_url || '',
                    author: hit.author || '',
                    downloads: hit.downloads || 0,
                    minecraftVersion,
                    loader: projectType === 'mod' ? normalizeLoader(loader) : 'resourcepack',
                    ...compatibleVersion,
                };
            })
        );

        res.json({
            hits: results.filter(Boolean),
            totalHits: response.data.total_hits || 0,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to search Modrinth mods' });
    }
};

module.exports = {
    getLauncherConfig,
    updateLauncherConfig,
    uploadLauncherLogo,
    uploadLauncherFile,
    uploadLauncherPresetFile,
    getLauncherContent,
    getMinecraftVersions,
    getModLoaders,
    getModLoaderVersions,
    getModrinthCategories,
    searchModrinthMods,
};
