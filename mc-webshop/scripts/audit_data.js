const mongoose = require('mongoose');
const User = require('../server/models/User');
const Transaction = require('../server/models/Transaction');
require('dotenv').config({ path: './.env' });

const auditData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Total Users: ${users.length}`);

        for (const user of users) {
            const approvedTx = await Transaction.countDocuments({ user: user._id, status: 'approved' });
            const pendingTx = await Transaction.countDocuments({ user: user._id, status: 'pending' });
            console.log(`User: ${user.name} (${user.email}) - Approved: ${approvedTx}, Pending: ${pendingTx}`);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

auditData();
