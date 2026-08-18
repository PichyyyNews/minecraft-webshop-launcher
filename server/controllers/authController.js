const User = require('../models/User');
const Setting = require('../models/Setting');
const jwt = require('jsonwebtoken');
const { executeRconCommand } = require('../utils/rconUtil');
const { registerAuthMeUser, changeAuthMePassword } = require('../utils/authmeDb');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Sync to AuthMe MySQL database (direct DB connection, no RCON needed)
    try {
      const authmeSetting = await Setting.findOne({ key: 'authmeEnabled' });
      const isAuthMeEnabled = authmeSetting ? authmeSetting.value === 'true' : true;

      if (isAuthMeEnabled) {
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        const result = await registerAuthMeUser(name, password, clientIp, email);
        console.log(`[AuthMe DB] Register result for ${name}: ${result.message}`);
      } else {
        console.log(`[AuthMe] Skipped AuthMe registration (disabled in settings)`);
      }
    } catch (authmeError) {
      console.error(`[AuthMe DB] Failed to register user ${name}:`, authmeError.message);
      // We don't fail the web registration if AuthMe sync fails, but we log it.
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Support both email or username fields from frontend
    const identifier = email || username;

    // Validate identifier & password
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email/username and password' });
    }

    // Check for user by email OR name
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { name: identifier }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    user.lastActive = new Date();
    user.lastIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // user is already fetched in protect middleware
    const user = req.user;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

// @desc    Reset user password (Admin only)
// @route   PUT /api/auth/reset-password/:userId
// @access  Private/Admin
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Sync password to AuthMe MySQL
    try {
      await changeAuthMePassword(user.name, newPassword);
    } catch (authmeError) {
      console.error(`[AuthMe DB] Failed to sync password for ${user.name}:`, authmeError.message);
    }

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Use referer or origin to determine frontend URL, or fallback to localhost:3000
    const frontendUrl = req.headers.origin || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
        html
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Sync password to AuthMe MySQL
    try {
      await changeAuthMePassword(user.name, req.body.password);
    } catch (authmeError) {
      console.error(`[AuthMe DB] Failed to sync password for ${user.name}:`, authmeError.message);
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
