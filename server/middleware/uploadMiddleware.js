const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Use memory storage to process image with sharp before saving
const storage = multer.memoryStorage();

// Helper to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Configure upload limits and filters
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp|svg|ico|gltf|glb|bin/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        // For GLTF/GLB/BIN, mimetype might vary or be application/octet-stream, so rely on extension mostly
        // but try to check known mimetypes
        const mimetype = filetypes.test(file.mimetype) ||
            file.mimetype === 'image/svg+xml' ||
            file.mimetype === 'image/x-icon' ||
            file.mimetype === 'image/vnd.microsoft.icon' ||
            file.mimetype === 'model/gltf+json' ||
            file.mimetype === 'model/gltf-binary' ||
            file.mimetype === 'application/octet-stream';

        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Allowed files: Images, GLTF, GLB, BIN'));
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
                const ext = path.extname(originalname).toLowerCase();
                const isImage = /jpeg|jpg|png|gif|webp|svg|ico/.test(ext.replace('.', ''));

                const filename = `${uuidv4()}${ext}`;
                const absoluteFilepath = path.join(absoluteUploadDir, filename);
                const relativeFilepath = path.join(relativeUploadDir, filename);

                if (isImage) {
                    let sharpInstance = sharp(buffer);
                    let extension = 'webp';

                    if (category === 'slips') {
                        sharpInstance = sharpInstance.jpeg({ quality: 80 });
                        extension = 'jpg';
                    } else if (ext !== '.svg' && ext !== '.ico') {
                        sharpInstance = sharpInstance.webp({ quality: 80 });
                    }

                    // If it's svg or ico, sharp might not be needed or handled differently, 
                    // but for simplicity, let's just save originals for non-convertible types if any issues arise,
                    // or assume sharp handles them. 
                    // For now, let's keep previous logic: convert to webp unless slips (jpg). 
                    // BUT: SVG/ICO are special. Let's just save them as is if we can, or convert. 
                    // Actually, let's refine:

                    if (ext === '.svg' || ext === '.ico') {
                        // Save directly
                        fs.writeFileSync(absoluteFilepath, buffer);
                    } else {
                        // WEBP/JPG Conversion
                        const finalFilename = `${uuidv4()}.${extension}`;
                        const finalAbsoluteFilepath = path.join(absoluteUploadDir, finalFilename);
                        const finalRelativeFilepath = path.join(relativeUploadDir, finalFilename);

                        await sharpInstance.toFile(finalAbsoluteFilepath);
                        return finalRelativeFilepath.replace(/\\/g, '/');
                    }
                } else {
                    // Non-image (GLTF, GLB, BIN) - Save directly
                    fs.writeFileSync(absoluteFilepath, buffer);
                }

                return relativeFilepath.replace(/\\/g, '/'); // Normalize for DB
            };

            // Handle legacy single file 'image'
            if (req.file) {
                const processedPath = await processFile(req.file.buffer, req.file.originalname);
                req.file.path = processedPath;
                req.file.filename = path.basename(processedPath);
                req.file.destination = absoluteUploadDir;
                req.body.image = processedPath; // Main image path
            }

            // Handle multiple files (upload.fields)
            if (req.files) {
                // Parse blockTextures if it exists as string in body
                if (req.body.blockTextures && typeof req.body.blockTextures === 'string') {
                    try {
                        req.body.blockTextures = JSON.parse(req.body.blockTextures);
                    } catch (e) {
                        console.error('Failed to parse blockTextures JSON in middleware', e);
                    }
                }

                for (const fieldName in req.files) {
                    const files = req.files[fieldName];
                    if (!files || files.length === 0) continue;

                    const file = files[0]; // Assume maxCount: 1 per field
                    const processedPath = await processFile(file.buffer, file.originalname);

                    if (fieldName === 'image') {
                        req.body.image = processedPath;
                    } else if (fieldName === 'gltfModel') {
                        req.body.gltfModel = processedPath;
                    } else if (fieldName.startsWith('blockTexture_')) {
                        const face = fieldName.replace('blockTexture_', '');
                        if (!req.body.blockTextures || typeof req.body.blockTextures !== 'object') {
                            req.body.blockTextures = {};
                        }
                        req.body.blockTextures[face] = processedPath;
                    }
                }
            }

            next();
        } catch (error) {
            console.error('Image processing error:', error);
            next(error);
        }
    };
};

module.exports = { upload, processImage };
