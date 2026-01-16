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

const checkMultiplier = async () => {
    await connectDB();
    const setting = await Setting.findOne({ key: 'topupMultiplier' });
    console.log('Current topupMultiplier:', setting ? setting.value : 'Not Set (Defaults to 1.0)');
    process.exit();
};

checkMultiplier();
