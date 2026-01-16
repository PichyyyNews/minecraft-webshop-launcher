const Ticket = require('../models/Ticket');
const fs = require('fs');
const path = require('path');

// Create new ticket
exports.createTicket = async (req, res) => {
    try {
        const { userId, subject, message } = req.body;

        // Validate userId
        if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID. Please login again.'
            });
        }

        const ticketData = {
            userId,
            subject,
            message,
            imageUrl: req.file ? `/${req.file.path}` : null
        };

        const ticket = new Ticket(ticketData);
        await ticket.save();

        res.status(201).json({ success: true, ticket });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
};

// Get tickets for a specific user
exports.getUserTickets = async (req, res) => {
    try {
        const { userId } = req.params;
        const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
};

// Get all tickets (admin)
exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
};

// Update ticket status
exports.updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const ticket = await Ticket.findByIdAndUpdate(
            id,
            { status, updatedAt: Date.now() },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Failed to update ticket status' });
    }
};

// Reply to ticket
exports.replyToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        const ticket = await Ticket.findByIdAndUpdate(
            id,
            {
                adminReply: reply,
                status: 'replied',
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Error replying to ticket:', error);
        res.status(500).json({ message: 'Failed to reply to ticket' });
    }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Delete image if exists
        if (ticket.imageUrl) {
            try {
                let urlPath = ticket.imageUrl;
                if (urlPath.startsWith('http')) {
                    urlPath = urlPath.split('uploads/')[1];
                    if (urlPath) urlPath = 'uploads/' + urlPath;
                } else if (urlPath.startsWith('/')) {
                    urlPath = urlPath.substring(1);
                }

                if (urlPath) {
                    const filepath = path.join(__dirname, '../', urlPath);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }
            } catch (err) {
                console.error('Error deleting ticket image:', err);
            }
        }

        await Ticket.findByIdAndDelete(id);
        res.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ message: 'Failed to delete ticket' });
    }
};
