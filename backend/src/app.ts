import 'express-async-errors';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { apiResponseMiddleware } from './middleware/apiResponse';

import authRoutes from './routes/auth.routes';
import resumeRoutes from './routes/resume.routes';
import analysisRoutes from './routes/analysis.routes';
import jobRoutes from './routes/job.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';
import chatRoutes from './routes/chat.routes';

const app: Application = express();

// ─── Security Middleware ────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: [
        config.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://your-frontend.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── HTTP Logging ───────────────────────────────────────────
app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── API Response Standardization ──────────────────────────
app.use(apiResponseMiddleware);

// ─── Rate Limiting ──────────────────────────────────────────
app.use('/api/', rateLimiter.general);

// ─── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/chat', chatRoutes);

// ─── Error Handler (must be last) ──────────────────────────
app.use(errorHandler);

export default app;
