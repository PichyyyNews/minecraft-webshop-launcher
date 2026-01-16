const express = require('express');
const router = express.Router();
const {
    getAllTags,
    createTag,
    updateTag,
    deleteTag
} = require('../controllers/tagController');

// Routes
router.get('/', getAllTags);
router.post('/', createTag);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

module.exports = router;
