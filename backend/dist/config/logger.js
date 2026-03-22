"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});
const transports = [
    // Console (dev only)
    new winston_1.default.transports.Console({
        format: combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), logFormat),
        silent: env_1.config.NODE_ENV === 'production',
    }),
    // Daily rotating error log
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(env_1.config.LOG_DIR, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(timestamp(), errors({ stack: true }), winston_1.default.format.json()),
    }),
    // Daily rotating combined log
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(env_1.config.LOG_DIR, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '14d',
        format: combine(timestamp(), winston_1.default.format.json()),
    }),
];
exports.logger = winston_1.default.createLogger({
    level: env_1.config.LOG_LEVEL,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    transports,
    exceptionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(env_1.config.LOG_DIR, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(env_1.config.LOG_DIR, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    ],
});
//# sourceMappingURL=logger.js.map