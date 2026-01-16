const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getPackages, createPackage, updatePackage, deletePackage } = require('../controllers/pointPackageController');

const { upload, processImage } = require('../middleware/uploadMiddleware');

router.get('/', getPackages);
router.post('/', upload.single('image'), processImage('packages'), createPackage);
router.put('/:id', upload.single('image'), processImage('packages'), updatePackage);
router.delete('/:id', deletePackage);

module.exports = router;
