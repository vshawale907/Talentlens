import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('5000'),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
    GEMINI_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o'),
    OPENAI_MAX_TOKENS: z.string().transform(Number).default('4096'),
    AI_SERVICE_URL: z.string().default('http://localhost:8000'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    MAX_FILE_SIZE_MB: z.string().transform(Number).default('10'),
    UPLOAD_DIR: z.string().default('uploads'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().optional(),
    STRIPE_PRICE_ENTERPRISE: z.string().optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
    LOG_DIR: z.string().default('logs'),
    ADMIN_EMAIL: z.string().email().default('admin@airesume.com'),

    // Email / SMTP Configuration
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.string().transform(Number).default('587'),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),

    // AWS S3 Configuration
    AWS_REGION: z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    AWS_S3_ENDPOINT: z.string().optional(), // Needed for Cloudflare R2 / MinIO 

    // Qdrant Vector DB
    QDRANT_URL: z.string().default('http://localhost:6333'),
    QDRANT_API_KEY: z.string().optional(),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
    console.error('❌ Invalid environment variables:\n', _parsed.error.format());
    process.exit(1);
}

export const config = _parsed.data;
export type Config = typeof config;
