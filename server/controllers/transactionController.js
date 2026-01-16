const Transaction = require('../models/Transaction');
const User = require('../models/User');
const PointPackage = require('../models/PointPackage');
const Setting = require('../models/Setting'); // Import Setting model
const { verifySlip2Go } = require('../utils/slip2go'); // Import verifySlip2Go
const { redeemAngpao } = require('../utils/angpao'); // Import redeemAngpao
const path = require('path');
const fs = require('fs');

// Helper to award points
const awardPoints = async (transaction) => {
    let pointsToAdd = 0;

    if (transaction.points) {
        pointsToAdd = transaction.points;
    } else if (transaction.package && transaction.package.points) {
        pointsToAdd = transaction.package.points;
    }

    if (pointsToAdd > 0) {
        const user = await User.findByIdAndUpdate(
            transaction.user,
            { $inc: { points: pointsToAdd } },
            { new: true }
        );
        if (user) {
            console.log(`Added ${pointsToAdd} points to user ${user.email} (ID: ${user._id}) for transaction ${transaction._id}`);
            return true;
        } else {
            console.error(`User ${transaction.user} not found for transaction ${transaction._id}`);
            return false;
        }
    } else {
        console.warn(`Transaction ${transaction._id} approved but no points to add.`);
        return true;
    }
};

// @desc    Create a new transaction (top-up request)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
    try {
        const { packageId, amount, points, paymentMethod, angpaoLink } = req.body;
        const userId = req.user.id;

        const transactionData = {
            user: userId,
            paymentMethod: paymentMethod || 'qr',
            status: 'pending'
        };

        // Handle Package vs Dynamic
        if (packageId) {
            const pointPackage = await PointPackage.findById(packageId);
            if (!pointPackage) {
                return res.status(404).json({ message: 'Package not found' });
            }
            transactionData.points = pointPackage.points;
            transactionData.package = packageId;
            transactionData.price = pointPackage.price;
        } else {
            // Dynamic Topup
            if (!amount) {
                return res.status(400).json({ message: 'Amount is required' });
            }
            transactionData.price = amount;

            // Get Multiplier from Settings
            const multiplierSetting = await Setting.findOne({ key: 'topupMultiplier' });
            const multiplier = multiplierSetting ? parseFloat(multiplierSetting.value) : 1.0;

            // Calculate points
            transactionData.points = amount * multiplier;
        }

        // Handle Payment Method specific fields
        if (transactionData.paymentMethod === 'qr') {
            if (!req.file) {
                return res.status(400).json({ message: 'Slip image is required' });
            }
            transactionData.slipUrl = `/${req.file.path}`;

            // --- Prevent Duplicate Slip (Hash Check) ---
            const crypto = require('crypto');
            const fileBuffer = fs.readFileSync(req.file.path);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const slipHash = hashSum.digest('hex');

            // Check if this slip hash already exists in APPROVED transactions
            const existingSlip = await Transaction.findOne({ slipHash: slipHash, status: 'approved' });
            if (existingSlip) {
                // Delete the uploaded file to save space since it's rejected
                try { fs.unlinkSync(req.file.path); } catch (e) { }
                return res.status(400).json({ message: 'Duplicate slip detected! This slip has already been used.' });
            }

            transactionData.slipHash = slipHash;
            // -------------------------------------------

            // Check Slip Verification Mode
            const slipCheckModeSetting = await Setting.findOne({ key: 'slipCheckMode' });
            const slipCheckMode = slipCheckModeSetting ? slipCheckModeSetting.value : 'manual';

            if (slipCheckMode === 'auto') {
                const apiKeySetting = await Setting.findOne({ key: 'slip2goApiKey' });
                const apiKey = apiKeySetting ? apiKeySetting.value : '';

                if (apiKey) {
                    console.log('Attempting Slip2Go verification...', { filePath: req.file.path, apiKey: apiKey.substring(0, 5) + '...', amount: transactionData.price });
                    try {
                        const verifyResult = await verifySlip2Go(req.file.path, apiKey, transactionData.price);
                        console.log('Slip2Go Result:', verifyResult);

                        if (verifyResult.success) {
                            transactionData.status = 'approved';
                            transactionData.processedAt = Date.now();
                            transactionData.remark = 'Auto-approved by Slip2Go';
                        } else {
                            console.warn(`Slip verification failed: ${verifyResult.message}`);

                            // Check duplicate error from Slip2Go
                            if (verifyResult.message && verifyResult.message.includes('Slip is Duplicated')) {
                                try { fs.unlinkSync(req.file.path); } catch (e) { }
                                return res.status(400).json({ message: 'Duplicate slip detected by Slip2Go! This slip has already been used.' });
                            }

                            // If other auto-check fails, keep as pending for admin manual review
                            transactionData.remark = `Auto-check failed: ${verifyResult.message}`;
                        }
                    } catch (verifyError) {
                        console.error('Slip verification failed:', verifyError.message);
                        transactionData.remark = `Auto-check error: ${verifyError.message}`;
                        // Do not reject automatically on API error, let admin check manually
                    }
                }
            }

        } else if (transactionData.paymentMethod === 'truemoney') {
            if (!angpaoLink) {
                return res.status(400).json({ message: 'Angpao link is required' });
            }
            transactionData.angpaoLink = angpaoLink;

            // Auto Verify Angpao
            const tmNumberSetting = await Setting.findOne({ key: 'trueMoneyNumber' }); // Receiver number
            const receiverNumber = tmNumberSetting ? tmNumberSetting.value : '';

            if (receiverNumber) {
                try {
                    const angpaoResult = await redeemAngpao(angpaoLink, receiverNumber);

                    if (angpaoResult.success) {
                        // Check if amount matches request
                        if (angpaoResult.amount >= transactionData.price) {
                            transactionData.status = 'approved';
                            transactionData.processedAt = Date.now();
                            transactionData.remark = `Auto-redeemed: ${angpaoResult.amount} THB`;
                        } else {
                            // Amount mismatch - Adjust and Approve
                            transactionData.price = angpaoResult.amount;

                            // Recalculate points (Always recalculate if amount mismatches, even for packages)
                            const multiplierSetting = await Setting.findOne({ key: 'topupMultiplier' });
                            const multiplier = multiplierSetting ? parseFloat(multiplierSetting.value) : 1.0;

                            transactionData.points = angpaoResult.amount * multiplier;

                            // If it was a package transaction, remove package reference since criteria wasn't met
                            if (packageId) {
                                delete transactionData.package;
                            }

                            transactionData.status = 'approved';
                            transactionData.processedAt = Date.now();
                            transactionData.remark = `Auto-redeemed (Amount adjusted): ${angpaoResult.amount} THB`;
                        }
                    } else {
                        console.warn(`Angpao redemption failed: ${angpaoResult.message}`);
                        // Return error to user immediately
                        return res.status(400).json({ message: angpaoResult.message });
                    }
                } catch (err) {
                    console.error('Angpao redemption error:', err);
                    return res.status(500).json({ message: `System Error: ${err.message}` });
                }
            } else {
                return res.status(400).json({ message: 'Receiver number not configured by admin' });
            }
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();

        // If auto-approved, award points
        if (transaction.status === 'approved') {
            await awardPoints(transaction);
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private (Admin/User)
const getTransactions = async (req, res) => {
    try {
        let query = {};

        // If not admin, only show own transactions
        if (req.user.role !== 'admin') {
            query.user = req.user.id;
        } else {
            // Admin can filter by status if provided
            if (req.query.status) {
                query.status = req.query.status;
            }
        }

        const transactions = await Transaction.find(query)
            .populate('user', 'name email')
            .populate('package', 'name price points')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update transaction status (Approve/Reject)
// @route   PUT /api/transactions/:id
// @access  Admin
const updateTransactionStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const transaction = await Transaction.findById(req.params.id).populate('package');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: 'Transaction already processed' });
        }

        transaction.status = status;
        transaction.processedAt = Date.now();

        if (status === 'approved') {
            await awardPoints(transaction);
        }

        await transaction.save();
        res.json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createTransaction,
    getTransactions,
    updateTransactionStatus
};
