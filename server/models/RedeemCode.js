const mongoose = require('mongoose');

const RedeemCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    rewardType: {
        type: String,
        required: true,
        enum: ['points', 'product']
    },
    points: {
        type: Number,
        default: 0
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    maxUses: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RedeemCode', RedeemCodeSchema);
