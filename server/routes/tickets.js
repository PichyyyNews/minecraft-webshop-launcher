const express = require('express');
const router = express.Router();

const {
    createTicket,
    getUserTickets,
    getAllTickets,
    updateTicketStatus,
    replyToTicket,
    deleteTicket
} = require('../controllers/ticketController');

const { upload, processImage } = require('../middleware/uploadMiddleware');
const { protect, admin } = require('../middleware/authMiddleware');

// Routes
router.post('/', protect, upload.single('image'), processImage('tickets'), createTicket);
router.get('/user/:userId', protect, getUserTickets);
router.get('/', protect, admin, getAllTickets);
router.put('/:id/status', protect, admin, updateTicketStatus);
router.put('/:id/reply', protect, admin, replyToTicket);
router.delete('/:id', protect, admin, deleteTicket);

module.exports = router;
