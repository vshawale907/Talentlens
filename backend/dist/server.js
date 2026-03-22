"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./config/logger");
const resumeWorker_1 = require("./workers/resumeWorker");
const qdrant_1 = require("./config/qdrant");
const bootstrap = async () => {
    try {
        // Connect to MongoDB
        await (0, database_1.connectDB)();
        logger_1.logger.info('✅ MongoDB connected');
        // Connect to Redis
        await (0, redis_1.connectRedis)();
        logger_1.logger.info('✅ Redis connected');
        // Start background workers
        (0, resumeWorker_1.startResumeWorker)();
        logger_1.logger.info('✅ Resume processing worker started');
        // Initialize Qdrant vector collections (graceful — ok if Qdrant is not running)
        try {
            await (0, qdrant_1.initQdrantCollections)();
            logger_1.logger.info('✅ Qdrant collections initialized');
        }
        catch (err) {
            logger_1.logger.warn(`⚠️  Qdrant unavailable: ${err?.message}. Semantic search will fall back to keyword matching.`);
        }
        // Start HTTP server
        const server = app_1.default.listen(env_1.config.PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${env_1.config.PORT} [${env_1.config.NODE_ENV}]`);
        });
        // Graceful shutdown
        const shutdown = (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully...`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Unhandled rejections
        process.on('unhandledRejection', (reason) => {
            logger_1.logger.error('Unhandled Rejection:', reason);
            server.close(() => process.exit(1));
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
bootstrap();
//# sourceMappingURL=server.js.map