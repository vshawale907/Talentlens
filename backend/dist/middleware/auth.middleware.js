"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSubscription = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errorHandler_1 = require("./errorHandler");
const User_model_1 = require("../models/User.model");
const authenticate = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new errorHandler_1.UnauthorizedError('No token provided');
    }
    const token = authHeader.split(' ')[1];
    const decoded = jsonwebtoken_1.default.verify(token, env_1.config.JWT_SECRET);
    const user = await User_model_1.UserModel.findById(decoded.id).select('-password').lean();
    if (!user)
        throw new errorHandler_1.UnauthorizedError('User no longer exists');
    if (!user.isActive)
        throw new errorHandler_1.UnauthorizedError('Account is deactivated');
    req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
    };
    next();
};
exports.authenticate = authenticate;
const authorize = (...roles) => (req, _res, next) => {
    if (!req.user)
        throw new errorHandler_1.UnauthorizedError();
    if (!roles.includes(req.user.role)) {
        throw new errorHandler_1.ForbiddenError('Insufficient permissions for this resource');
    }
    next();
};
exports.authorize = authorize;
const requireSubscription = (...tiers) => (req, _res, next) => {
    if (!req.user)
        throw new errorHandler_1.UnauthorizedError();
    if (!tiers.includes(req.user.subscriptionTier)) {
        throw new errorHandler_1.ForbiddenError('This feature requires a higher subscription tier');
    }
    next();
};
exports.requireSubscription = requireSubscription;
//# sourceMappingURL=auth.middleware.js.map