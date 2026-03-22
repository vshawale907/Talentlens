import app from './app';
import { config } from './config/env';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { startResumeWorker } from './workers/resumeWorker';
import { initQdrantCollections } from './config/qdrant';

const bootstrap = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('✅ MongoDB connected');

        // Connect to Redis
        await connectRedis();
        logger.info('✅ Redis connected');

        // Start background workers
        startResumeWorker();
        logger.info('✅ Resume processing worker started');

        // Ping AI Service Health
        try {
            const { nlpClient } = await import('./services/nlp.client');
            const isHealthy = await nlpClient.healthCheck();
            if (isHealthy) {
                logger.info('✅ Python NLP Service is healthy');
            } else {
                logger.warn('⚠️  Python NLP Service is unreachable or unhealthy (graceful degradation)');
            }
        } catch (err: any) {
            logger.warn(`⚠️  Python NLP Service health ping failed: ${err?.message}`);
        }

        // Initialize Qdrant vector collections (graceful — ok if Qdrant is not running)
        try {
            await initQdrantCollections();
            logger.info('✅ Qdrant collections initialized');
        } catch (err: any) {
            logger.warn(`⚠️  Qdrant unavailable: ${err?.message}. Semantic search will fall back to keyword matching.`);
        }

        // Start HTTP server
        const PORT = process.env.PORT || config.PORT || 5000;
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} [${config.NODE_ENV}]`);
        });

        // Graceful shutdown
        const shutdown = (signal: string) => {
            logger.info(`Received ${signal}, shutting down gracefully...`);
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Unhandled rejections
        process.on('unhandledRejection', (reason: unknown) => {
            logger.error('Unhandled Rejection:', reason);
            server.close(() => process.exit(1));
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

bootstrap();
