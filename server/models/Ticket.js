const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'replied', 'resolved'],
        default: 'unread'
    },
    adminReply: {
        type: String,
        default: null
    },
    tag: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt on save
ticketSchema.pre('save', function () {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Ticket', ticketSchema);
