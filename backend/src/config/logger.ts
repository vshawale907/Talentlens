import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

const transports: winston.transport[] = [
    // Console (dev only)
    new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            timestamp({ format: 'HH:mm:ss' }),
            errors({ stack: true }),
            logFormat
        ),
        silent: config.NODE_ENV === 'production',
    }),

    // Daily rotating error log
    new DailyRotateFile({
        filename: path.join(config.LOG_DIR, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
    }),

    // Daily rotating combined log
    new DailyRotateFile({
        filename: path.join(config.LOG_DIR, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '14d',
        format: combine(timestamp(), winston.format.json()),
    }),
];

export const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports,
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(config.LOG_DIR, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(config.LOG_DIR, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    ],
});
