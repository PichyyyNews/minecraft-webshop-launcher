const AuditLog = require('../models/AuditLog');

const logAuditAction = async (req, action, target, details = {}) => {
    try {
        const adminUser = req?.user?.name || req?.user?.username || 'Admin';
        const adminId = req?.user?._id;
        const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';

        await AuditLog.create({
            adminUser,
            adminId,
            action,
            target,
            details,
            ip,
        });
    } catch (err) {
        console.error('Failed to record audit log:', err);
    }
};

module.exports = { logAuditAction };
