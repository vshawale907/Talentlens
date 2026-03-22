"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errorHandler_1 = require("./errorHandler");
const createLimiter = (windowMs, max, message) => (0, express_rate_limit_1.default)({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(new errorHandler_1.AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    },
});
exports.rateLimiter = {
    // General API: 200 requests per 15 minutes
    general: createLimiter(15 * 60 * 1000, 200, 'Too many requests, please try again later.'),
    // Auth endpoints: 10 attempts per 15 minutes
    auth: createLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts. Please try again after 15 minutes.'),
    // Forgot password: 5 attempts per hour (separate from auth to avoid blocking legitimate resets)
    forgotPassword: createLimiter(60 * 60 * 1000, 5, 'Too many password reset attempts. Please try again after 1 hour.'),
    // AI analysis: 20 per hour (expensive operations)
    analysis: createLimiter(60 * 60 * 1000, 20, 'Analysis rate limit reached. Please upgrade your plan or try again later.'),
    // File upload: 10 per hour
    upload: createLimiter(60 * 60 * 1000, 10, 'Upload rate limit reached. Please try again later.'),
    // Chat: 60 per hour
    chat: createLimiter(60 * 60 * 1000, 60, 'Chat rate limit reached. Please try again later.'),
};
//# sourceMappingURL=rateLimiter.js.map