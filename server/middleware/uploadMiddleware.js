const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Magic bytes signatures for file validation
const MAGIC_BYTES = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    gif: [0x47, 0x49, 0x46, 0x38],
    webp: [0x52, 0x49, 0x46, 0x46], // RIFF header, needs additional validation
    ico: [0x00, 0x00, 0x01, 0x00],
};

// Allowed MIME types (strict)
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon'
];

// Allowed extensions
const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|webp|ico)$/i;

/**
 * Validate file magic bytes to ensure file content matches extension
 */
const validateMagicBytes = (buffer, originalname) => {
    if (!buffer || buffer.length < 8) return false;

    const ext = path.extname(originalname).toLowerCase().replace('.', '');

    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        case 'png':
            return MAGIC_BYTES.png.every((byte, i) => buffer[i] === byte);
        case 'gif':
            return MAGIC_BYTES.gif.every((byte, i) => buffer[i] === byte);
        case 'webp':
            // RIFF....WEBP
            return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
        case 'ico':
            return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
        default:
            return false;
    }
};

/**
 * Sanitize filename to remove dangerous characters
 */
const sanitizeFilename = (filename) => {
    // Remove path separators and dangerous characters
    return filename
        .replace(/[\/\\]/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .substring(0, 255);
};

// Use memory storage to process image with sharp before saving
const storage = multer.memoryStorage();

// Helper to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Configure upload limits and filters (STRICT)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Allow multiple fields
    },
    fileFilter: function (req, file, cb) {
        // Check extension
        const extValid = ALLOWED_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());

        // Check MIME type (strict)
        const mimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);

        // Sanitize filename
        file.originalname = sanitizeFilename(file.originalname);

        if (extValid && mimeValid) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WEBP, ICO) are allowed.'));
        }
    }
});


/**
 * Middleware to process and save image/file
 * @param {string} category - Category name for folder organization (e.g., 'products', 'slips', 'tickets')
 */
const processImage = (category) => {
    return async (req, res, next) => {
        if (!req.file && (!req.files || Object.keys(req.files).length === 0)) return next();

        try {
            // Create date-based folder structure
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');

            // Absolute path for saving file (server/uploads)
            const absoluteUploadDir = path.join(__dirname, '../uploads', category, String(year), String(month));
            // Relative path for DB (uploads/...)
            const relativeUploadDir = path.join('uploads', category, String(year), String(month));

            ensureDirectoryExists(absoluteUploadDir);

            // Reusable helper for processing a single file buffer
            const processFile = async (buffer, originalname) => {
                // SECURITY: Validate magic bytes
                if (!validateMagicBytes(buffer, originalname)) {
                    throw new Error('File content does not match file extension. Possible malicious file detected.');
                }

                const ext = path.extname(originalname).toLowerCase();
                const isImage = /\.?(jpeg|jpg|png|gif|webp|ico)$/i.test(ext);

                if (!isImage) {
                    throw new Error('Only image files are allowed.');
                }

                const filename = `${uuidv4()}${ext}`;
                const absoluteFilepath = path.join(absoluteUploadDir, filename);
                const relativeFilepath = path.join(relativeUploadDir, filename);

                let sharpInstance = sharp(buffer);
                let extension = 'webp';

                if (category === 'slips') {
                    sharpInstance = sharpInstance.jpeg({ quality: 80 });
                    extension = 'jpg';
                } else if (ext !== '.ico') {
                    sharpInstance = sharpInstance.webp({ quality: 80 });
                }

                if (ext === '.ico') {
                    // Save ICO directly
                    fs.writeFileSync(absoluteFilepath, buffer);
                    return relativeFilepath.replace(/\\/g, '/');
                } else {
                    // WEBP/JPG Conversion
                    const finalFilename = `${uuidv4()}.${extension}`;
                    const finalAbsoluteFilepath = path.join(absoluteUploadDir, finalFilename);
                    const finalRelativeFilepath = path.join(relativeUploadDir, finalFilename);

                    await sharpInstance.toFile(finalAbsoluteFilepath);
                    return finalRelativeFilepath.replace(/\\/g, '/');
                }
            };

            // Handle legacy single file 'image'
            if (req.file) {
                const processedPath = await processFile(req.file.buffer, req.file.originalname);
                req.file.path = processedPath;
                req.file.filename = path.basename(processedPath);
                req.file.destination = absoluteUploadDir;
                req.body.image = processedPath;
            }

            // Handle multiple files (upload.fields)
            if (req.files) {
                for (const fieldName in req.files) {
                    const files = req.files[fieldName];
                    if (!files || files.length === 0) continue;

                    const file = files[0];
                    const processedPath = await processFile(file.buffer, file.originalname);

                    if (fieldName === 'image') {
                        req.body.image = processedPath;
                    }
                }
            }

            next();
        } catch (error) {
            // Return security error
            return res.status(400).json({
                message: error.message || 'File processing failed',
                error: 'SECURITY_VALIDATION_FAILED'
            });
        }
    };
};

module.exports = { upload, processImage };
