const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PointPackage'
    },
    paymentMethod: {
        type: String,
        enum: ['qr', 'truemoney'],
        default: 'qr'
    },
    slipUrl: {
        type: String
    },
    slipHash: {
        type: String,
        index: true // Add index for faster queries
    },
    angpaoLink: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    },
    price: {
        type: Number
    },
    points: {
        type: Number
    },
    remark: {
        type: String
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
