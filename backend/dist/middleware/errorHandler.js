"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    errors;
    constructor(errors) {
        super('Validation failed', 422, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err, req, res, _next) => {
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    });
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        const errors = {};
        err.errors.forEach((e) => {
            const key = e.path.join('.');
            errors[key] = errors[key] || [];
            errors[key].push(e.message);
        });
        res.status(422).json({ success: false, message: 'Validation failed', errors });
        return;
    }
    // Custom app errors
    if (err instanceof AppError) {
        const body = {
            success: false,
            message: err.message,
            code: err.code,
        };
        if (err instanceof ValidationError)
            body.errors = err.errors;
        res.status(err.statusCode).json(body);
        return;
    }
    // Mongoose duplicate key
    if (err.name === 'MongoServerError' &&
        err.code === 11000) {
        res.status(409).json({ success: false, message: 'Duplicate entry', code: 'DUPLICATE_KEY' });
        return;
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
    }
    // Google/OpenAI SDK errors (not wrapped as AppError) — give a human-friendly message
    if (err.name === 'GoogleGenerativeAIError' || err.message?.includes('GoogleGenerativeAI') ||
        err.message?.includes('generativelanguage.googleapis.com')) {
        const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('rate limit');
        res.status(isQuota ? 429 : 502).json({
            success: false,
            message: isQuota
                ? 'AI is busy right now. Please wait a moment and try again.'
                : 'AI analysis failed. Please check your API key and try again.',
            code: isQuota ? 'AI_RATE_LIMIT' : 'AI_ERROR',
        });
        return;
    }
    // Python NLP service connection errors
    if (err.code === 'ECONNREFUSED' ||
        err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
        res.status(502).json({
            success: false,
            message: 'NLP service is unavailable. Analysis will use AI fallback.',
            code: 'NLP_UNAVAILABLE',
        });
        return;
    }
    // Generic 500
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map