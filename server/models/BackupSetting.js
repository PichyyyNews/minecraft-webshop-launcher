const mongoose = require('mongoose');

const BackupSettingSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['local', 'aws_s3', 'azure_blob', 'custom_s3'],
        default: 'aws_s3'
    },
    awsAccessKeyId: {
        type: String,
        default: ''
    },
    awsSecretAccessKey: {
        type: String,
        default: ''
    },
    awsRegion: {
        type: String,
        default: 'ap-southeast-1'
    },
    s3BucketName: {
        type: String,
        default: ''
    },
    wormRetentionDays: {
        type: Number,
        default: 30
    },
    localBackupDirectory: {
        type: String,
        default: './backups'
    },
    isConfigured: {
        type: Boolean,
        default: false
    },
    updatedBy: {
        type: String,
        default: 'Root Admin'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BackupSetting', BackupSettingSchema);
