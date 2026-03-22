import Redis from 'ioredis';
export declare const connectRedis: () => Promise<Redis>;
export declare const getRedis: () => Redis;
export declare const cache: {
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
    del: (key: string) => Promise<void>;
    invalidatePattern: (pattern: string) => Promise<void>;
};
//# sourceMappingURL=redis.d.ts.map