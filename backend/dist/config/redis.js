"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.getRedis = exports.connectRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
let redisClient;
const connectRedis = async () => {
    redisClient = new ioredis_1.default(env_1.config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
    });
    redisClient.on('connect', () => logger_1.logger.info('Redis connecting...'));
    redisClient.on('ready', () => logger_1.logger.info('Redis ready'));
    redisClient.on('error', (err) => logger_1.logger.error('Redis error:', err));
    redisClient.on('close', () => logger_1.logger.warn('Redis connection closed'));
    await redisClient.connect();
    return redisClient;
};
exports.connectRedis = connectRedis;
const getRedis = () => {
    if (!redisClient)
        throw new Error('Redis not initialized. Call connectRedis() first.');
    return redisClient;
};
exports.getRedis = getRedis;
exports.cache = {
    get: async (key) => {
        const data = await (0, exports.getRedis)().get(key);
        return data ? JSON.parse(data) : null;
    },
    set: async (key, value, ttlSeconds = 3600) => {
        await (0, exports.getRedis)().setex(key, ttlSeconds, JSON.stringify(value));
    },
    del: async (key) => {
        await (0, exports.getRedis)().del(key);
    },
    invalidatePattern: async (pattern) => {
        const keys = await (0, exports.getRedis)().keys(pattern);
        if (keys.length)
            await (0, exports.getRedis)().del(...keys);
    },
};
//# sourceMappingURL=redis.js.map