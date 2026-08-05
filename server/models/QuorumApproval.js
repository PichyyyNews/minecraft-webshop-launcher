const mongoose = require('mongoose');

const QuorumApprovalSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    actionType: {
        type: String,
        required: true // e.g. 'DELETE_WORM_BACKUP', 'REDUCE_GFS_RETENTION', 'FORCE_FAILOVER'
    },
    requestedBy: {
        type: String,
        required: true
    },
    targetResource: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    requiredApprovals: {
        type: Number,
        default: 2
    },
    approvedBy: [{
        adminName: String,
        approvedAt: Date,
        ip: String
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('QuorumApproval', QuorumApprovalSchema);
