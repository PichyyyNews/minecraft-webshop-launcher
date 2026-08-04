const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Connect to database
connectDB().then(() => {
  const { initAuthMeFromSettings } = require('./utils/authmeDb');
  initAuthMeFromSettings();
});

const app = express();

// Trust proxy for reverse proxy setups (Cloudflare, Caddy, Nginx)
app.set('trust proxy', true);

// Security middlewares
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimitMiddleware');
const { sanitizeInput } = require('./middleware/securityMiddleware');

// Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for now as it may break frontend
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:1420',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  process.env.FRONTEND_URL,
  process.env.API_URL,
  process.env.LAUNCHER_URL
].filter(Boolean).map(url => url.replace(/\/$/, ''));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);

    // Remove trailing slash from origin for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');

    // Check if origin is allowed or if we are in development
    if (allowedOrigins.indexOf(normalizedOrigin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-launcher-version']
}));


// Body parser with limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply sanitization to all requests
app.use(sanitizeInput);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

const { upload, processImage } = require('./middleware/uploadMiddleware');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ensure generic files upload directory exists
const filesUploadDir = path.join(__dirname, 'uploads', 'files');
if (!fs.existsSync(filesUploadDir)) {
  fs.mkdirSync(filesUploadDir, { recursive: true });
}

const multer = require('multer');
const genericFileUpload = multer({
  storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, filesUploadDir),
      filename: (req, file, cb) => {
          const safeName = file.originalname.replace(/[\/\\<>:"|?*]/g, '').replace(/\.\./g, '');
          cb(null, safeName);
      },
  }),
  limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/defaults', express.static(path.join(__dirname, '../public/defaults')));

// Apply auth rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/server', require('./routes/server'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/socials', require('./routes/socials'));
app.use('/api/point-packages', require('./routes/pointPackages'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/redeem', require('./routes/redeem'));
app.use('/api/wiki', require('./routes/wiki'));
app.use('/api/admin', require('./routes/adminAuth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin-users', require('./routes/adminUsers'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/rcon', require('./routes/rcon'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/team', require('./routes/team'));
app.use('/api/launcher', require('./routes/launcher'));

// Auto-Login verify for Minecraft Plugin
const { verifyJoinToken } = require('./controllers/autologinController');
app.get('/api/server/verify-login', verifyJoinToken);

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

    // Turnstile public site key configuration defaults (for front-end)
    if (!settingsMap.turnstileSiteKey) {
      settingsMap.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
    }
    if (!settingsMap.turnstileEnabled) {
      settingsMap.turnstileEnabled = 'false';
    }

    res.json(settingsMap);
  } catch (error) {
    // Don't log errors to console in production
    res.status(500).json({ message: 'Server Error' });
  }
});

// Save multiple settings
app.post('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const { encrypt } = require('./utils/encryption');
    const { logAuditAction } = require('./utils/auditLogger');
    const updates = req.body;

    for (let [key, value] of Object.entries(updates)) {
      if (key === 'rconPassword' && value && !value.includes(':')) {
        value = encrypt(value);
      }
      await Setting.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    }

    await logAuditAction(req, 'UPDATE_SETTINGS', 'System Settings', { updatedKeys: Object.keys(updates) });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Helper for settings upload - Apply upload rate limit
const handleSettingUpload = async (req, res, key, message) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  let relativePath = req.file.path.replace(/\\/g, '/');
  
  // If the path is absolute (e.g. from generic multer), extract the 'uploads/...' part
  const uploadsIndex = relativePath.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    relativePath = relativePath.substring(uploadsIndex);
  }
  
  // Ensure it doesn't start with a slash to avoid double slashes
  relativePath = relativePath.replace(/^\/+/, '');

  const storedUrl = `/${relativePath}`;

  try {
    const Setting = require('./models/Setting');
    await Setting.findOneAndUpdate(
      { key: key },
      { value: storedUrl },
      { upsert: true, new: true }
    );
    res.json({ message: message, filename: req.file.filename, url: storedUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Logo upload route
app.post('/api/settings/logo', uploadLimiter, upload.single('logo'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'logoUrl', 'File uploaded successfully');
});

// Background upload route
app.post('/api/settings/background', uploadLimiter, upload.single('background'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'backgroundUrl', 'File uploaded successfully');
});

// Get logo setting
app.get('/api/settings/logo', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const setting = await Setting.findOne({ key: 'logoUrl' });
    const defaultLogo = 'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg';
    res.json({ url: setting ? setting.value : defaultLogo });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Favicon upload route
app.post('/api/settings/favicon', uploadLimiter, upload.single('favicon'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'faviconUrl', 'Favicon uploaded successfully');
});

// Social Image upload route
app.post('/api/settings/social-image', uploadLimiter, upload.single('socialImage'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'socialImageUrl', 'Social image uploaded successfully');
});

// Payment QR upload route
app.post('/api/settings/payment-qr', uploadLimiter, upload.single('paymentQr'), processImage('settings'), async (req, res) => {
  await handleSettingUpload(req, res, 'paymentQrUrl', 'Payment QR uploaded successfully');
});

// Hero File upload route
app.post('/api/settings/hero-file', uploadLimiter, genericFileUpload.single('heroFile'), async (req, res) => {
  await handleSettingUpload(req, res, 'heroButtonLink', 'Hero file uploaded successfully');
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't expose internal errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS error', error: 'FORBIDDEN' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  // Minimal server startup log
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Server running on port ${PORT}`);
  }
});

// Handle unhandled promise rejections silently in production
process.on('unhandledRejection', (err, promise) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`Error: ${err.message}`);
  }
});
