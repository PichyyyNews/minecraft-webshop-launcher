const mongoose = require('mongoose');

const BackupJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['snapshot', 'full', 'incremental', 'differential', 'synthetic_full', 'cdp_journal'],
        default: 'incremental'
    },
    consistency: {
        type: String,
        enum: ['app_consistent', 'crash_consistent'],
        default: 'app_consistent'
    },
    status: {
        type: String,
        enum: ['running', 'completed', 'failed', 'verifying', 'recovering'],
        default: 'completed'
    },
    sizeBytes: {
        type: Number,
        default: 0
    },
    dedupRatio: {
        type: Number,
        default: 4.2
    },
    storageTier: {
        type: String,
        enum: ['hot_nvme', 'warm_nas', 'cold_worm_archive'],
        default: 'hot_nvme'
    },
    gfsLevel: {
        type: String,
        enum: ['son_daily', 'father_weekly', 'grandfather_monthly', 'manual'],
        default: 'son_daily'
    },
    isImmutable: {
        type: Boolean,
        default: false
    },
    wormUntil: {
        type: Date,
        default: null
    },
    airGappedStatus: {
        type: Boolean,
        default: true
    },
    verificationStatus: {
        bootTestPassed: { type: Boolean, default: true },
        dbCheckPassed: { type: Boolean, default: true },
        heartbeatMs: { type: Number, default: 42 },
        verifiedAt: { type: Date, default: Date.now }
    },
    checksum: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'Root System'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BackupJob', BackupJobSchema);
