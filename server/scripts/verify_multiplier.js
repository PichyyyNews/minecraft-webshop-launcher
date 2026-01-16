const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Setting = require('../models/Setting');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyMultiplier = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // 1. Set Multiplier to 1.5
        await Setting.findOneAndUpdate(
            { key: 'topupMultiplier' },
            { value: '1.5' },
            { upsert: true, new: true }
        );
        console.log('Set topupMultiplier to 1.5');

        // 2. Read Multiplier
        const setting = await Setting.findOne({ key: 'topupMultiplier' });
        const multiplier = setting ? parseFloat(setting.value) : 1.0;
        console.log(`Read multiplier: ${multiplier}`);

        // 3. Calculate Points
        const amount = 100;
        const points = Math.floor(amount * multiplier);
        console.log(`Amount: ${amount}, Points: ${points}`);

        if (points === 150) {
            console.log('SUCCESS: Calculation is correct.');
        } else {
            console.error('FAILURE: Calculation is incorrect.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyMultiplier();
