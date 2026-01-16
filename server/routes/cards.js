const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getCards, createCard, deleteCard } = require('../controllers/cardController');

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'card-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.get('/', getCards);
router.post('/', upload.single('image'), createCard);
router.delete('/:id', deleteCard);

module.exports = router;
