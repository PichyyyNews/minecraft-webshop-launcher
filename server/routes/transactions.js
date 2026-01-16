const express = require('express');
const router = express.Router();
const { createTransaction, getTransactions, updateTransactionStatus } = require('../controllers/transactionController');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload, processImage } = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, upload.single('slip'), processImage('slips'), createTransaction)
    .get(protect, getTransactions);

router.route('/:id')
    .put(protect, admin, updateTransactionStatus);

module.exports = router;
