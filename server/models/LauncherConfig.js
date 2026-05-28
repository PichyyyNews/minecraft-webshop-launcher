const mongoose = require('mongoose');

const LauncherModSchema = new mongoose.Schema({
    projectId: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    iconUrl: {
        type: String,
        default: '',
    },
    author: {
        type: String,
        default: '',
    },
    minecraftVersion: {
        type: String,
        required: true,
    },
    loader: {
        type: String,
        required: true,
    },
    versionId: {
        type: String,
        required: true,
    },
    versionNumber: {
        type: String,
        default: '',
    },
    fileName: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        default: 0,
    },
    sha1: {
        type: String,
        default: '',
    },
}, {
    _id: false,
});

const LauncherConfigSchema = new mongoose.Schema({
    appName: {
        type: String,
        default: 'MC Launcher',
    },
    headline: {
        type: String,
        default: 'พร้อมเข้าเซิร์ฟเวอร์',
    },
    description: {
        type: String,
        default: 'Launcher service แยกสำหรับเชื่อมระบบเว็บช็อปกับตัวเกม Minecraft',
    },
    serverName: {
        type: String,
        default: 'Survival Network',
    },
    serverAddress: {
        type: String,
        default: 'play.example.com',
    },
    serverPort: {
        type: String,
        default: '25565',
    },
    installType: {
        type: String,
        enum: ['vanilla', 'modded'],
        default: 'vanilla',
    },
    installFolderName: {
        type: String,
        default: 'minecraft-client',
    },
    minecraftVersion: {
        type: String,
        default: '1.21.8',
    },
    loaderType: {
        type: String,
        enum: ['Vanilla', 'Fabric', 'Forge', 'Quilt'],
        default: 'Vanilla',
    },
    modLoaderVersion: {
        type: String,
        default: '',
    },
    optionsFileUrl: {
        type: String,
        default: '',
    },
    configFileUrl: {
        type: String,
        default: '',
    },
    resourcePackUrl: {
        type: String,
        default: '',
    },
    mods: {
        type: [LauncherModSchema],
        default: [],
    },
    resourcePacks: {
        type: [LauncherModSchema],
        default: [],
    },
    minMemoryMb: {
        type: Number,
        default: 2048,
    },
    maxMemoryMb: {
        type: Number,
        default: 4096,
    },
    newsTitle: {
        type: String,
        default: 'Welcome',
    },
    newsBody: {
        type: String,
        default: 'อัปเดตข่าวสาร launcher ได้จากหน้า admin',
    },
    primaryColor: {
        type: String,
        default: '#8fde5d',
    },
    backgroundUrl: {
        type: String,
        default: '',
    },
    logoUrl: {
        type: String,
        default: '',
    },
    maintenanceMode: {
        type: Boolean,
        default: false,
    },
    maintenanceMessage: {
        type: String,
        default: 'Launcher is under maintenance.',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('LauncherConfig', LauncherConfigSchema);
