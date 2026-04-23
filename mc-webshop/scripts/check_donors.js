const mongoose = require('mongoose');
const Transaction = require('../server/models/Transaction');
const User = require('../server/models/User');
const PointPackage = require('../server/models/PointPackage');
require('dotenv').config({ path: './.env' });

const checkDonors = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const topDonors = await Transaction.aggregate([
            { $match: { status: 'approved' } },
            {
                $lookup: {
                    from: 'pointpackages',
                    localField: 'package',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            { $unwind: '$packageDetails' },
            {
                $group: {
                    _id: '$user',
                    totalAmount: { $sum: '$packageDetails.price' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    name: '$userDetails.name',
                    totalAmount: 1
                }
            }
        ]);

        console.log('Top Donors Found:', topDonors);
        console.log('Total Count:', topDonors.length);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDonors();
