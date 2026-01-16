const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true,
        min: 0
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
    category: {
        type: String,
        default: 'General'
    },
    command: {
        type: String,
        default: ''
    },
    allowGift: {
        type: Boolean,
        default: false
    },
    displayType: {
        type: String,
        enum: ['image', '3d', 'block', 'model'],
        default: 'image'
    },
    gltfModel: {
        type: String,
        default: ''
    },
    modelSettings: {
        showAxes: { type: Boolean, default: false },
        autoRotate: { type: Boolean, default: true },
        bgType: { type: String, enum: ['solid', 'gradient'], default: 'solid' },
        bgColor: { type: String, default: '#121212' },
        gradientStart: { type: String, default: '#1e1e1e' },
        gradientEnd: { type: String, default: '#3a3a3a' }
    },
    blockTextures: {
        front: { type: String, default: '' },
        back: { type: String, default: '' },
        top: { type: String, default: '' },
        bottom: { type: String, default: '' },
        left: { type: String, default: '' },
        right: { type: String, default: '' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);
