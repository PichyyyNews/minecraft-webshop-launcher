const mongoose = require('mongoose');

const RconLogSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true
    },
    response: {
        type: String,
        default: ''
    },
    sender: {
        type: String,
        default: 'Console'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RconLog', RconLogSchema);
