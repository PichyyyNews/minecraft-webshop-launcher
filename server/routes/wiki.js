const express = require('express');
const router = express.Router();
const wikiController = require('../controllers/wikiController');
const { upload, processImage } = require('../middleware/uploadMiddleware');

// Routes
router.get('/', wikiController.getWikis);
router.get('/latest', wikiController.getLatestWikis);
router.get('/:id', wikiController.getWikiById);
router.post('/', upload.single('image'), processImage('wiki'), wikiController.createWiki);
router.put('/:id', upload.single('image'), processImage('wiki'), wikiController.updateWiki);
router.delete('/:id', wikiController.deleteWiki);

module.exports = router;
