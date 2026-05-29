const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {
        type: String,
        required: true,
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
    productName: {
        type: String,
        default: ''
    },
    redeemedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Redemption', RedemptionSchema);
