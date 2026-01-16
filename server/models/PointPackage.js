const mongoose = require('mongoose');

const PointPackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    points: {
        type: Number,
        required: true,
        min: 1
    },
    imageUrl: {
        type: String,
        default: ''
    },

    tag: {
        type: String,
        default: ''
    },
    tagColor: {
        type: String,
        default: '#ff0000'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PointPackage', PointPackageSchema);
