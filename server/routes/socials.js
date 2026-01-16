const express = require('express');
const router = express.Router();
const {
    getSocials,
    addSocial,
    deleteSocial,
} = require('../controllers/socialController');

router.route('/').get(getSocials).post(addSocial);
router.route('/:id').delete(deleteSocial);

module.exports = router;
