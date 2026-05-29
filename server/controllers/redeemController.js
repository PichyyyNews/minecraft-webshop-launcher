const RedeemCode = require('../models/RedeemCode');
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const { executeRconCommand, checkPlayerOnline } = require('../utils/rconUtil');

// Helper to generate a random code
const generateRandomCode = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// @desc    Get all redeem codes (Admin only)
// @route   GET /api/admin/redeem-codes
// @access  Private/Admin
exports.getRedeemCodes = async (req, res) => {
    try {
        const codes = await RedeemCode.find().populate('product', 'name price').sort({ createdAt: -1 });
        res.json(codes);
    } catch (error) {
        console.error('Error fetching redeem codes:', error);
        res.status(500).json({ message: 'Failed to fetch redeem codes' });
    }
};

// @desc    Create a redeem code (Admin only)
// @route   POST /api/admin/redeem-codes
// @access  Private/Admin
exports.createRedeemCode = async (req, res) => {
    try {
        const { code, rewardType, points, product, maxUses, startDate, endDate } = req.body;

        let finalCode = code ? code.toUpperCase().trim() : generateRandomCode(10);

        // Check if code already exists
        const existing = await RedeemCode.findOne({ code: finalCode });
        if (existing) {
            return res.status(400).json({ message: 'Redeem code already exists' });
        }

        const newCode = new RedeemCode({
            code: finalCode,
            rewardType,
            points: rewardType === 'points' ? points : 0,
            product: rewardType === 'product' ? product : undefined,
            maxUses: maxUses === '' || maxUses === undefined ? null : Number(maxUses),
            startDate: startDate || null,
            endDate: endDate || null
        });

        await newCode.save();
        res.status(201).json({ success: true, redeemCode: newCode });
    } catch (error) {
        console.error('Error creating redeem code:', error);
        res.status(500).json({ message: 'Failed to create redeem code' });
    }
};

// @desc    Update a redeem code (Admin only)
// @route   PUT /api/admin/redeem-codes/:id
// @access  Private/Admin
exports.updateRedeemCode = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, rewardType, points, product, maxUses, startDate, endDate } = req.body;

        const redeemCode = await RedeemCode.findById(id);
        if (!redeemCode) {
            return res.status(404).json({ message: 'Redeem code not found' });
        }

        if (code) {
            const formattedCode = code.toUpperCase().trim();
            if (formattedCode !== redeemCode.code) {
                const existing = await RedeemCode.findOne({ code: formattedCode });
                if (existing) {
                    return res.status(400).json({ message: 'Redeem code already exists' });
                }
                redeemCode.code = formattedCode;
            }
        }

        redeemCode.rewardType = rewardType || redeemCode.rewardType;
        redeemCode.points = rewardType === 'points' ? points : 0;
        redeemCode.product = rewardType === 'product' ? product : undefined;
        redeemCode.maxUses = maxUses === '' || maxUses === undefined ? null : Number(maxUses);
        redeemCode.startDate = startDate || null;
        redeemCode.endDate = endDate || null;

        await redeemCode.save();
        res.json({ success: true, redeemCode });
    } catch (error) {
        console.error('Error updating redeem code:', error);
        res.status(500).json({ message: 'Failed to update redeem code' });
    }
};

// @desc    Delete a redeem code (Admin only)
// @route   DELETE /api/admin/redeem-codes/:id
// @access  Private/Admin
exports.deleteRedeemCode = async (req, res) => {
    try {
        const { id } = req.params;
        const redeemCode = await RedeemCode.findById(id);
        if (!redeemCode) {
            return res.status(404).json({ message: 'Redeem code not found' });
        }

        await redeemCode.deleteOne();
        res.json({ success: true, message: 'Redeem code deleted successfully' });
    } catch (error) {
        console.error('Error deleting redeem code:', error);
        res.status(500).json({ message: 'Failed to delete redeem code' });
    }
};

// @desc    Get all redemption logs (Admin only)
// @route   GET /api/admin/redeem-logs
// @access  Private/Admin
exports.getRedemptionLogs = async (req, res) => {
    try {
        const logs = await Redemption.find()
            .populate('user', 'name email')
            .populate('product', 'name')
            .sort({ redeemedAt: -1 });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching redemption logs:', error);
        res.status(500).json({ message: 'Failed to fetch redemption logs' });
    }
};

// @desc    Redeem a code (User)
// @route   POST /api/redeem
// @access  Private
exports.redeemCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสแลกรางวัล' });
        }

        const formattedCode = code.toUpperCase().trim();
        const redeemCode = await RedeemCode.findOne({ code: formattedCode });
        if (!redeemCode) {
            return res.status(404).json({ message: 'ไม่พบรหัสแลกรางวัลนี้' });
        }

        // Check date validity
        const now = new Date();
        if (redeemCode.startDate && now < new Date(redeemCode.startDate)) {
            return res.status(400).json({ message: 'รหัสแลกรางวัลนี้ยังไม่เริ่มใช้งาน' });
        }
        if (redeemCode.endDate && now > new Date(redeemCode.endDate)) {
            return res.status(400).json({ message: 'รหัสแลกรางวัลนี้หมดอายุการใช้งานแล้ว' });
        }

        // Check global usage limits
        if (redeemCode.maxUses !== null && redeemCode.usedCount >= redeemCode.maxUses) {
            return res.status(400).json({ message: 'รหัสแลกรางวัลนี้ถูกใช้งานครบจำนวนสิทธิ์แล้ว' });
        }

        // Check user duplicate claim
        const alreadyRedeemed = await Redemption.findOne({ user: req.user.id, code: formattedCode });
        if (alreadyRedeemed) {
            return res.status(400).json({ message: 'คุณเคยใช้งานรหัสแลกรางวัลนี้ไปแล้ว' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
        }

        let productName = '';
        let pointsEarned = 0;

        // Atomically increment code usage count
        await RedeemCode.updateOne({ _id: redeemCode._id }, { $inc: { usedCount: 1 } });

        // Process reward
        if (redeemCode.rewardType === 'points') {
            pointsEarned = redeemCode.points;
            user.points += pointsEarned;
            await user.save();
        } else if (redeemCode.rewardType === 'product') {
            const product = await Product.findById(redeemCode.product);
            if (!product) {
                // Revert usedCount increment
                await RedeemCode.updateOne({ _id: redeemCode._id }, { $inc: { usedCount: -1 } });
                return res.status(400).json({ message: 'สินค้าของรหัสนี้ไม่มีอยู่ในระบบแล้ว' });
            }

            // Check if player is online in-game first before doing any actions
            const onlineStatus = await checkPlayerOnline(user.name);
            if (!onlineStatus.online && !onlineStatus.cannotVerify) {
                // Revert usedCount increment
                await RedeemCode.updateOne({ _id: redeemCode._id }, { $inc: { usedCount: -1 } });
                return res.status(400).json({ message: 'คุณไม่ได้ออนไลน์อยู่ในเซิร์ฟเวอร์ขณะนี้ กรุณาเข้าสู่เกมก่อนใช้โค้ดแลกสินค้า' });
            }

            productName = product.name;

            // Execute RCON command if configured
            if (product.command) {
                const commandToRun = product.command.replace(/\[player\]/g, user.name);
                try {
                    await executeRconCommand(commandToRun, `Redeem Code (${formattedCode})`);
                } catch (rconError) {
                    console.error('RCON Command execution failed during redeem:', rconError);
                    // We continue the redeem process but log the RCON error
                }
            }

            // Create purchase record in history for free
            const purchase = new Purchase({
                user: user._id,
                product: product._id,
                productName: product.name,
                price: 0,
                command: product.command || '',
                status: 'completed'
            });
            await purchase.save();
        }

        // Create redemption record
        const log = new Redemption({
            user: user._id,
            code: formattedCode,
            rewardType: redeemCode.rewardType,
            points: pointsEarned,
            product: redeemCode.rewardType === 'product' ? redeemCode.product : undefined,
            productName: productName
        });
        await log.save();

        res.json({
            success: true,
            message: 'แลกของรางวัลสำเร็จ!',
            rewardType: redeemCode.rewardType,
            points: pointsEarned,
            productName: productName,
            userPoints: user.points
        });
    } catch (error) {
        console.error('Error redeeming code:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแลกโค้ดรางวัล' });
    }
};
