const express = require('express');
const router = express.Router();

const { getProducts, getFeaturedProducts, createProduct, updateProduct, deleteProduct, purchaseProduct, getMyPurchases } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const { upload, processImage } = require('../middleware/uploadMiddleware');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);

// Simplified upload - only image allowed (3D removed)
const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 }
]);

router.post('/', protect, admin, uploadLimiter, uploadFields, processImage('products'), createProduct);
router.put('/:id', protect, admin, uploadLimiter, uploadFields, processImage('products'), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:id/buy', protect, purchaseProduct);
router.get('/purchases/me', protect, getMyPurchases);

module.exports = router;
