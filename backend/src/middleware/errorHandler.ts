import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(message: string, statusCode = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public readonly errors: Record<string, string[]>;
    constructor(errors: Record<string, string[]>) {
        super('Validation failed', 422, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    });

    // Zod validation errors
    if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {};
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
        const body: Record<string, unknown> = {
            success: false,
            message: err.message,
            code: err.code,
        };
        if (err instanceof ValidationError) body.errors = err.errors;
        res.status(err.statusCode).json(body);
        return;
    }

    // Mongoose duplicate key
    if ((err as NodeJS.ErrnoException).name === 'MongoServerError' &&
        (err as { code?: number }).code === 11000) {
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

    // Redis connection errors
    if (err.message?.includes('Redis') || err.message?.includes('ETIMEDOUT')) {
        res.status(503).json({
            success: false,
            message: 'Caching service is temporarily unavailable. Core features should still work.',
            code: 'REDIS_ERROR',
        });
        return;
    }

    // Generic 500
    res.status(500).json({
        success: false,
        // TEMPORARILY EXPOSING THIS FOR DIAGNOSTICS - REVERT ONCE THE BUG IS FOUND
        message: err.message || 'Something went wrong. Please try again.',
        code: 'INTERNAL_ERROR',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
