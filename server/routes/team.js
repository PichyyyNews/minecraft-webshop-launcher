const express = require('express');
const router = express.Router();
const {
    getTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember
} = require('../controllers/teamController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTeamMembers)
    .post(protect, admin, createTeamMember);

router.route('/:id')
    .put(protect, admin, updateTeamMember)
    .delete(protect, admin, deleteTeamMember);

module.exports = router;
