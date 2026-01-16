const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Public (Protected by frontend admin check)
const getUsers = async (req, res) => {
    try {
        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'transactions',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'userTransactions'
                }
            },
            {
                $addFields: {
                    totalSpent: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$userTransactions',
                                        as: 'tx',
                                        cond: { $eq: ['$$tx.status', 'approved'] }
                                    }
                                },
                                as: 'tx',
                                in: '$$tx.price'
                            }
                        }
                    },
                    totalPointsHistory: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$userTransactions',
                                        as: 'tx',
                                        cond: { $eq: ['$$tx.status', 'approved'] }
                                    }
                                },
                                as: 'tx',
                                in: '$$tx.points'
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    password: 0,
                    userTransactions: 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public (Protected by frontend admin check)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle ban status
// @route   PUT /api/users/:id/ban
// @access  Public (Protected by frontend admin check)
const toggleBan = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.isBanned = !user.isBanned;
            await user.save();
            res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'}`, isBanned: user.isBanned });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Public (Protected by frontend admin check)
const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
            await user.save();
            res.json({ message: 'Password updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user name
// @route   PUT /api/users/:id/name
// @access  Public (Protected by frontend admin check)
const updateName = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.name = req.body.name || user.name;
            await user.save();
            res.json({
                message: 'Name updated successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    isBanned: user.isBanned
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user points
// @route   PUT /api/users/:id/points
// @access  Public (Protected by frontend admin check)
const updatePoints = async (req, res) => {
    try {
        const { points } = req.body;
        const user = await User.findById(req.params.id);

        if (user) {
            user.points = points;
            await user.save();
            res.json({ message: 'Points updated', points: user.points });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get top donors
// @route   GET /api/users/top-donors
// @access  Public
const getTopDonors = async (req, res) => {
    try {
        const { period, limit } = req.query;
        const limitNum = parseInt(limit) || 10;

        let matchStage = { status: 'approved' };

        if (period === 'monthly') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            matchStage.createdAt = { $gte: startOfMonth };
        }

        const topDonors = await Transaction.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'pointpackages',
                    localField: 'package',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            { $unwind: { path: '$packageDetails', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$user',
                    totalAmount: { $sum: { $ifNull: ['$price', { $ifNull: ['$packageDetails.price', 0] }] } }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: limitNum },
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
                    _id: 1,
                    totalAmount: 1,
                    name: '$userDetails.name'
                }
            }
        ]);

        res.json(topDonors);
    } catch (error) {
        console.error('Error fetching top donors:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUsers,
    deleteUser,
    toggleBan,
    updatePassword,
    updateName,
    updateName,
    updatePoints,
    getTopDonors,
};
