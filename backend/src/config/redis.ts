import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let redisClient: Redis;

export const connectRedis = async (): Promise<Redis> => {
    redisClient = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
    });

    redisClient.on('connect', () => logger.info('Redis connecting...'));
    redisClient.on('ready', () => logger.info('✅ Redis ready'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('close', () => logger.warn('Redis connection closed'));

    await redisClient.connect();
    return redisClient;
};

export const getRedis = (): Redis => {
    if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
    return redisClient;
};

export const cache = {
    get: async <T>(key: string): Promise<T | null> => {
        const data = await getRedis().get(key);
        return data ? (JSON.parse(data) as T) : null;
    },
    set: async (key: string, value: unknown, ttlSeconds = 3600): Promise<void> => {
        await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
    },
    del: async (key: string): Promise<void> => {
        await getRedis().del(key);
    },
    invalidatePattern: async (pattern: string): Promise<void> => {
        const keys = await getRedis().keys(pattern);
        if (keys.length) await getRedis().del(...keys);
    },
};
