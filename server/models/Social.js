const mongoose = require('mongoose');

const SocialSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
        enum: ['facebook', 'twitter', 'instagram', 'youtube', 'discord', 'tiktok', 'twitch'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Social', SocialSchema);
