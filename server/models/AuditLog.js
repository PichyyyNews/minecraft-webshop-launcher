const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    adminUser: {
        type: String,
        required: true,
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    action: {
        type: String,
        required: true,
    },
    target: {
        type: String,
        default: 'System',
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ip: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
