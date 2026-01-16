const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const PointPackage = require('./models/PointPackage');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mcwebshop');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const inspectZeroAmount = async () => {
    await connectDB();

    try {
        console.log('--- Inspecting Transactions with Missing Packages ---');

        const transactions = await Transaction.find({ status: 'approved' })
            .populate('user', 'name');

        // Manually filter where package ref is likely broken (we'll check if we can find the package)
        // Actually, let's just list all approved transactions and check if we can find the package for them.

        const packages = await PointPackage.find({});
        const packageIds = packages.map(p => p._id.toString());

        const brokenTransactions = transactions.filter(t => {
            // Check if package ID exists in current packages
            // And also check if price is missing (since we added price field recently)
            return !packageIds.includes(t.package.toString()) && !t.price;
        });

        console.log(`Found ${brokenTransactions.length} broken transactions.`);

        brokenTransactions.forEach(t => {
            console.log(`\nTransaction ID: ${t._id}`);
            console.log(`User: ${t.user ? t.user.name : 'Unknown'} (ID: ${t.user ? t.user._id : t.user})`);
            console.log(`Package ID (Missing): ${t.package}`);
            console.log(`Created At: ${t.createdAt}`);
            console.log(`Slip URL: ${t.slipUrl}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
};

inspectZeroAmount();
