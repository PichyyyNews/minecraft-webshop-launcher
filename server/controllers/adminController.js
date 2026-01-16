const Transaction = require('../models/Transaction');
const Purchase = require('../models/Purchase');
const User = require('../models/User');

const getAnalytics = async (req, res) => {
    try {
        // 1. Total Revenue (from approved transactions)
        const totalRevenueResult = await Transaction.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        // 2. Total Points Spent (from completed purchases)
        const totalPointsSpentResult = await Purchase.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        const totalPointsSpent = totalPointsSpentResult.length > 0 ? totalPointsSpentResult[0].total : 0;

        // 3. User Stats
        const totalUsers = await User.countDocuments();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const newUsers = await User.countDocuments({ createdAt: { $gte: oneMonthAgo } });

        // 4. Revenue Over Time (Last 30 Days)
        const revenueOverTime = await Transaction.aggregate([
            {
                $match: {
                    status: 'approved',
                    createdAt: { $gte: oneMonthAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    amount: { $sum: "$price" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 5. Top Selling Items
        const topSellingItems = await Purchase.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: "$productName",
                    count: { $sum: 1 },
                    totalPoints: { $sum: "$price" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 6. Recent Transactions
        const recentTransactions = await Transaction.find({ status: 'approved' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .populate('package', 'name');

        res.json({
            totalRevenue,
            totalPointsSpent,
            totalUsers,
            newUsers,
            revenueOverTime,
            topSellingItems,
            recentTransactions
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSlip2GoInfo = async (req, res) => {
    try {
        let apiKey = req.headers['x-slip2go-key'];

        if (apiKey) {
            try {
                apiKey = decodeURIComponent(apiKey);
            } catch (e) {
                console.error('Error decoding API Key header:', e);
            }
        }

        if (!apiKey) {
            const Setting = require('../models/Setting');
            const setting = await Setting.findOne({ key: 'slip2goApiKey' });

            if (!setting || !setting.value) {
                console.error('Slip2Go Info: API Key not found in header or DB');
                return res.status(400).json({ message: 'Slip2Go API Key not found' });
            }
            apiKey = setting.value;
        }
        // console.log('Fetching Slip2Go info with key length:', apiKey.length); 

        const response = await fetch('https://connect.slip2go.com/api/account/info', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        // Handle non-JSON responses (like 502/504 HTML error pages)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error('Slip2Go non-JSON response:', response.status);
            return res.status(502).json({ message: 'Received non-JSON response from Slip2Go API' });
        }

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            console.error('Slip2Go API Error Response:', response.status, data);
            res.status(response.status).json({
                message: data.message || 'Failed to fetch from Slip2Go',
                code: data.code,
                error: data
            });
        }
    } catch (error) {
        console.error('Error fetching Slip2Go info:', error);
        res.status(500).json({ message: 'Internal Server Error fetching Slip2Go info', error: error.message });
    }
};

module.exports = {
    getAnalytics,
    getSlip2GoInfo
};
