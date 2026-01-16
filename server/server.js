const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());
app.use(express.json()); // Parse JSON bodies


const { upload, processImage } = require('./middleware/uploadMiddleware');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from uploads directory
// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/defaults', express.static(path.join(__dirname, '../public/defaults')));

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/server', require('./routes/server'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/socials', require('./routes/socials'));
app.use('/api/point-packages', require('./routes/pointPackages'));
app.use('/api/products', require('./routes/products'));
app.use('/api/wiki', require('./routes/wiki'));
app.use('/api/admin', require('./routes/adminAuth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/rcon', require('./routes/rcon'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/team', require('./routes/team'));

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const settings = await Setting.find({});
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    // Add default logo if not present
    if (!settingsMap.logoUrl) {
      settingsMap.logoUrl = 'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg';
    }

    // Add default background if not present
    if (!settingsMap.backgroundUrl) {
      settingsMap.backgroundUrl = '/default-bg.png';
    }

    // Add default favicon if not present
    if (!settingsMap.faviconUrl) {
      settingsMap.faviconUrl = '/favicon.ico';
    }

    // Add default title if not present
    if (!settingsMap.siteTitle) {
      settingsMap.siteTitle = 'MC Webshop';
    }

    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).send('Server Error');
  }
});

// Save multiple settings
app.post('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const updates = req.body; // Expecting { key: value, key2: value2 }

    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).send('Server Error');
  }
});

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Helper for settings upload
const handleSettingUpload = async (req, res, key, message) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Construct relative URL for storage
  // req.file.path is relative (uploads/settings/2024/01/uuid.webp)
  // We want to store '/uploads/settings/...' in the DB
  const relativePath = req.file.path.replace(/\\/g, '/');
  const storedUrl = `/${relativePath}`;

  try {
    const Setting = require('./models/Setting');
    await Setting.findOneAndUpdate(
      { key: key },
      { value: storedUrl },
      { upsert: true, new: true }
    );
    res.send({ message: message, filename: req.file.filename, url: storedUrl });
  } catch (error) {
    console.error(`Error saving ${key} setting:`, error);
    res.status(500).send('Server Error');
  }
};

// Logo upload route
app.post('/api/settings/logo', upload.single('logo'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'logoUrl', 'File uploaded successfully');
});

// Background upload route
app.post('/api/settings/background', upload.single('background'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'backgroundUrl', 'File uploaded successfully');
});

// Get logo setting (Deprecated in favor of /api/settings, but kept for backward compatibility if needed)
app.get('/api/settings/logo', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const setting = await Setting.findOne({ key: 'logoUrl' });
    const defaultLogo = 'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg';
    res.json({ url: setting ? setting.value : defaultLogo });
  } catch (error) {
    console.error('Error fetching logo setting:', error);
    res.status(500).send('Server Error');
  }
});

// Favicon upload route
app.post('/api/settings/favicon', upload.single('favicon'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'faviconUrl', 'Favicon uploaded successfully');
});

// Social Image upload route
app.post('/api/settings/social-image', upload.single('socialImage'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'socialImageUrl', 'Social image uploaded successfully');
});

// Payment QR upload route
app.post('/api/settings/payment-qr', upload.single('paymentQr'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'paymentQrUrl', 'Payment QR uploaded successfully');
});

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using API_URL: ${API_URL}`);
  }
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  // Don't close server & exit process, just log it
  // server.close(() => process.exit(1));
});
