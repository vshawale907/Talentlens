import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let redisClient: Redis;
let isRedisHealthy = false;
export const isRedisConnected = () => isRedisHealthy;

export const connectRedis = async (): Promise<Redis | null> => {
    try {
        redisClient = new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: 1, // Fail fast if Redis is down
            enableReadyCheck: false,
            lazyConnect: true,
            connectTimeout: 5000,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn(`Redis connection retry limit reached (${times}). Giving up.`);
                    isRedisHealthy = false;
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 2000);
            },
        });

        redisClient.on('connect', () => logger.info('Redis connecting...'));
        redisClient.on('ready', () => {
            logger.info('✅ Redis ready');
            isRedisHealthy = true;
        });
        redisClient.on('error', (err: any) => {
            logger.error(`Redis error: ${err.message}`);
            isRedisHealthy = false;
        });
        redisClient.on('close', () => {
            logger.warn('Redis connection closed');
            isRedisHealthy = false;
        });

        await redisClient.connect().catch(err => {
            logger.error(`Initial Redis connection failed: ${err.message}`);
            isRedisHealthy = false;
        });
        
        return redisClient;
    } catch (err: any) {
        logger.error(`Failed to initialize Redis client: ${err.message}`);
        isRedisHealthy = false;
        return null;
    }
};

export const getRedis = (): Redis => {
    if (!redisClient) {
        logger.warn('Redis not initialized. Initializing now with default URL.');
        // Fallback initialization if something calls getRedis before connectRedis
        redisClient = new Redis(config.REDIS_URL, { lazyConnect: true });
    }
    return redisClient;
};

export const cache = {
    get: async <T>(key: string): Promise<T | null> => {
        if (!isRedisHealthy) return null;
        try {
            const data = await getRedis().get(key);
            return data ? (JSON.parse(data) as T) : null;
        } catch { return null; }
    },
    set: async (key: string, value: unknown, ttlSeconds = 3600): Promise<void> => {
        if (!isRedisHealthy) return;
        try {
            await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
        } catch { /* ignore */ }
    },
    del: async (key: string): Promise<void> => {
        await getRedis().del(key);
    },
    invalidatePattern: async (pattern: string): Promise<void> => {
        const keys = await getRedis().keys(pattern);
        if (keys.length) await getRedis().del(...keys);
    },
};
