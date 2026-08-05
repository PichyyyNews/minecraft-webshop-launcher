const mongoose = require('mongoose');

const AuditTrailSchema = new mongoose.Schema({
    logId: {
        type: String,
        required: true,
        unique: true
    },
    actor: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Root / SuperAdmin', 'Admin', 'Operator', 'System'],
        default: 'Admin'
    },
    action: {
        type: String,
        required: true
    },
    resource: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        default: '127.0.0.1'
    },
    status: {
        type: String,
        enum: ['success', 'denied', 'pending_quorum', 'warning'],
        default: 'success'
    },
    checksumHash: {
        type: String,
        required: true
    },
    isImmutableLog: {
        type: Boolean,
        default: true
    },
    details: {
        type: String,
        default: ''
    },
    quorumApprovers: [{
        type: String
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AuditTrail', AuditTrailSchema);
