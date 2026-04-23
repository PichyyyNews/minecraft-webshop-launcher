const mongoose = require('mongoose');
const Setting = require('./server/models/Setting');
require('dotenv').config({ path: './server/.env' });

const checkSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const setting = await Setting.findOne({ key: 'trueMoneyNumber' });
        console.log('TrueMoney Number Setting:', setting);

        if (setting) {
            console.log('Value:', setting.value);
            console.log('Length:', setting.value.length);
        } else {
            console.log('Setting not found in DB');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSettings();
