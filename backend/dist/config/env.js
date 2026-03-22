"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('5000'),
    MONGO_URI: zod_1.z.string().min(1, 'MONGO_URI is required'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GROQ_API_KEY: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().default('gpt-4o'),
    OPENAI_MAX_TOKENS: zod_1.z.string().transform(Number).default('4096'),
    AI_SERVICE_URL: zod_1.z.string().default('http://localhost:8000'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    MAX_FILE_SIZE_MB: zod_1.z.string().transform(Number).default('10'),
    UPLOAD_DIR: zod_1.z.string().default('uploads'),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    STRIPE_PRICE_PRO: zod_1.z.string().optional(),
    STRIPE_PRICE_ENTERPRISE: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
    LOG_DIR: zod_1.z.string().default('logs'),
    ADMIN_EMAIL: zod_1.z.string().email().default('admin@airesume.com'),
    // Email / SMTP Configuration
    SMTP_HOST: zod_1.z.string().default('smtp.gmail.com'),
    SMTP_PORT: zod_1.z.string().transform(Number).default('587'),
    SMTP_USER: zod_1.z.string().default(''),
    SMTP_PASS: zod_1.z.string().default(''),
    // AWS S3 Configuration
    AWS_REGION: zod_1.z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    AWS_S3_BUCKET: zod_1.z.string().optional(),
    AWS_S3_ENDPOINT: zod_1.z.string().optional(), // Needed for Cloudflare R2 / MinIO 
    // Qdrant Vector DB
    QDRANT_URL: zod_1.z.string().default('http://localhost:6333'),
    QDRANT_API_KEY: zod_1.z.string().optional(),
});
const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
    console.error('❌ Invalid environment variables:\n', _parsed.error.format());
    process.exit(1);
}
exports.config = _parsed.data;
//# sourceMappingURL=env.js.map