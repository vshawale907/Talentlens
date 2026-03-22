"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const User_model_1 = require("../models/User.model");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
const email_service_1 = require("./email.service");
const generateTokens = (user) => {
    const payload = { id: user._id.toString(), email: user.email, role: user.role };
    const accessToken = jsonwebtoken_1.default.sign(payload, env_1.config.JWT_SECRET, {
        expiresIn: env_1.config.JWT_EXPIRES_IN,
    });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user._id.toString() }, env_1.config.JWT_REFRESH_SECRET, { expiresIn: env_1.config.JWT_REFRESH_EXPIRES_IN });
    return { accessToken, refreshToken };
};
exports.authService = {
    register: async (input) => {
        const existing = await User_model_1.UserModel.findOne({ email: input.email.toLowerCase() });
        if (existing)
            throw new errorHandler_1.AppError('Email already registered', 409, 'EMAIL_EXISTS');
        const user = await User_model_1.UserModel.create({
            name: input.name.trim(),
            email: input.email.toLowerCase().trim(),
            password: input.password,
            role: input.role || User_model_1.UserRole.USER,
            subscriptionTier: User_model_1.SubscriptionTier.FREE,
        });
        logger_1.logger.info(`New user registered: ${user.email} [${user.role}]`);
        const tokens = generateTokens(user);
        return { user: user.toJSON(), tokens };
    },
    login: async (input) => {
        const user = await User_model_1.UserModel.findOne({ email: input.email.toLowerCase() }).select('+password');
        if (!user)
            throw new errorHandler_1.UnauthorizedError('Invalid email or password');
        if (!user.isActive)
            throw new errorHandler_1.UnauthorizedError('Account is deactivated. Contact support.');
        const isMatch = await user.comparePassword(input.password);
        if (!isMatch)
            throw new errorHandler_1.UnauthorizedError('Invalid email or password');
        // Update last login
        await User_model_1.UserModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
        logger_1.logger.info(`User logged in: ${user.email}`);
        const tokens = generateTokens(user);
        return { user: user.toJSON(), tokens };
    },
    refreshToken: async (refreshToken) => {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.config.JWT_REFRESH_SECRET);
        }
        catch {
            throw new errorHandler_1.UnauthorizedError('Invalid or expired refresh token');
        }
        const user = await User_model_1.UserModel.findById(decoded.id);
        if (!user || !user.isActive)
            throw new errorHandler_1.UnauthorizedError('User not found or deactivated');
        return generateTokens(user);
    },
    changePassword: async (userId, currentPassword, newPassword) => {
        const user = await User_model_1.UserModel.findById(userId).select('+password');
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch)
            throw new errorHandler_1.AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
        user.password = newPassword;
        await user.save();
        logger_1.logger.info(`Password changed for user: ${user.email}`);
    },
    forgotPassword: async (email) => {
        const user = await User_model_1.UserModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Silently do nothing to prevent email enumeration attacks
            logger_1.logger.info(`Forgot password requested for unknown email: ${email}`);
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();
        logger_1.logger.info(`Forgot password requested for: ${user.email}`);
        // Send the actual reset email
        await email_service_1.emailService.sendPasswordResetEmail(user.email, resetToken);
    },
    resetPassword: async (token, newPassword) => {
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_model_1.UserModel.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpire: { $gt: new Date() }
        }).select('+password');
        if (!user)
            throw new errorHandler_1.AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save(); // password hook will re-hash it
        logger_1.logger.info(`Password successfully reset for user: ${user.email}`);
    },
    getProfile: async (userId) => {
        const user = await User_model_1.UserModel.findById(userId).lean();
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        return user;
    },
    updateProfile: async (userId, updates) => {
        const user = await User_model_1.UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        return user;
    },
};
//# sourceMappingURL=auth.service.js.map