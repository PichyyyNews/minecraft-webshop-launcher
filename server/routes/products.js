const express = require('express');
const router = express.Router();

const { getProducts, getFeaturedProducts, createProduct, updateProduct, deleteProduct, purchaseProduct, getMyPurchases } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

const { upload, processImage } = require('../middleware/uploadMiddleware');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gltfModel', maxCount: 1 },
    { name: 'blockTexture_front', maxCount: 1 },
    { name: 'blockTexture_back', maxCount: 1 },
    { name: 'blockTexture_top', maxCount: 1 },
    { name: 'blockTexture_bottom', maxCount: 1 },
    { name: 'blockTexture_left', maxCount: 1 },
    { name: 'blockTexture_right', maxCount: 1 }
]);

router.post('/', protect, admin, uploadFields, processImage('products'), createProduct);
router.put('/:id', protect, admin, uploadFields, processImage('products'), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:id/buy', protect, purchaseProduct);
router.get('/purchases/me', protect, getMyPurchases);

module.exports = router;
