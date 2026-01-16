const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

const sendEmail = async (options) => {
    // 1. Get SMTP settings from DB
    const settings = await Setting.find({
        key: { $in: ['smtpHost', 'smtpPort', 'smtpEmail', 'smtpPassword', 'smtpSecure', 'emailProvider'] }
    });

    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    // Default to 'smtp' if not set
    const provider = config.emailProvider || 'smtp';

    let transporter;

    if (provider === 'gmail') {
        // Gmail Configuration
        if (!config.smtpEmail || !config.smtpPassword) {
            throw new Error('Gmail settings not configured (Email and App Password required)');
        }

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.smtpEmail,
                pass: config.smtpPassword,
            },
        });
    } else {
        // Custom SMTP Configuration
        if (!config.smtpHost || !config.smtpEmail || !config.smtpPassword) {
            throw new Error('SMTP settings not configured');
        }

        transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: parseInt(config.smtpPort) || 587,
            secure: config.smtpSecure === 'true', // true for 465, false for other ports
            auth: {
                user: config.smtpEmail,
                pass: config.smtpPassword,
            },
        });
    }

    // 3. Define email options
    const message = {
        from: `${process.env.FROM_NAME || 'MC Webshop'} <${config.smtpEmail}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html, // Optional HTML content
    };

    // 4. Send email
    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
