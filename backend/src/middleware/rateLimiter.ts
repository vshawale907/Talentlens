import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';

const createLimiter = (windowMs: number, max: number, message: string) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, _res, next) => {
            next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
        },
    });

export const rateLimiter = {
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
