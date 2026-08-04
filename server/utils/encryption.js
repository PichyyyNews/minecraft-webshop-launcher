const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-secret-key-must-be-32-bytes-long!!';

const getDerivedKey = () => {
    return crypto.createHash('sha256').update(SECRET_KEY).digest();
};

const encrypt = (text) => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return iv.toString('hex') + ':' + authTag + ':' + encrypted;
    } catch (err) {
        console.error('Encryption error:', err);
        return text;
    }
};

const decrypt = (encryptedText) => {
    if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) return encryptedText;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        return encryptedText;
    }
};

module.exports = {
    encrypt,
    decrypt,
};
