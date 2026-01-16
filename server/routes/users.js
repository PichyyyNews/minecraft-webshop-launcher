const express = require('express');
const router = express.Router();
const { getUsers, deleteUser, toggleBan, updatePassword, updateName, updatePoints, getTopDonors } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/top-donors', getTopDonors);
router.get('/', protect, admin, getUsers);
router.delete('/:id', protect, admin, deleteUser);
router.put('/:id/ban', protect, admin, toggleBan);
router.put('/:id/password', protect, admin, updatePassword);
router.put('/:id/name', protect, admin, updateName);
router.put('/:id/points', protect, admin, updatePoints);

module.exports = router;
