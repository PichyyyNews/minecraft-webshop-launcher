const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Setting = require('./models/Setting');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection error:', err.message);
        process.exit(1);
    }
};

const checkSettings = async () => {
    await connectDB();
    const mode = await Setting.findOne({ key: 'slipCheckMode' });
    const key = await Setting.findOne({ key: 'slip2goApiKey' });
    console.log('slipCheckMode:', mode ? mode.value : 'NOT SET');
    console.log('slip2goApiKey:', key ? key.value : 'NOT SET');
    process.exit();
};

checkSettings();
