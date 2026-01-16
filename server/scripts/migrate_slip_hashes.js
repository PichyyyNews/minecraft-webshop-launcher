require('dotenv').config({ path: '../.env' }); // Load env from parent dir if needed, but adjust path
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');

// Adjust DB URI as per your config or .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcwebshop';

const migrate = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const transactions = await Transaction.find({
            paymentMethod: 'qr',
            slipUrl: { $exists: true, $ne: null },
            $or: [{ slipHash: { $exists: false } }, { slipHash: null }]
        });

        console.log(`Found ${transactions.length} transactions needing hash migration.`);

        let successCount = 0;
        let failCount = 0;

        for (const tx of transactions) {
            try {
                // Extract filename from URL
                // URL: http://localhost:5000/uploads/filename.jpg
                const filename = tx.slipUrl.split('/').pop();
                const filePath = path.join(__dirname, '../uploads', filename);

                if (fs.existsSync(filePath)) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const hashSum = crypto.createHash('md5');
                    hashSum.update(fileBuffer);
                    const slipHash = hashSum.digest('hex');

                    tx.slipHash = slipHash;
                    await tx.save();
                    // Process.stdout.write('.');
                    successCount++;
                } else {
                    console.warn(`File not found for TX ${tx._id}: ${filePath}`);
                    failCount++;
                }
            } catch (err) {
                console.error(`Error processing TX ${tx._id}:`, err.message);
                failCount++;
            }
        }

        console.log('\nMigration Complete.');
        console.log(`Success: ${successCount}`);
        console.log(`Missing Files/Errors: ${failCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration Fatal Error:', error);
        process.exit(1);
    }
};

migrate();
