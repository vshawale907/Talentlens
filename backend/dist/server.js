"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        // Ping AI Service Health
        try {
            const { nlpClient } = await Promise.resolve().then(() => __importStar(require('./services/nlp.client')));
            const isHealthy = await nlpClient.healthCheck();
            if (isHealthy) {
                logger_1.logger.info('✅ Python NLP Service is healthy');
            }
            else {
                logger_1.logger.warn('⚠️  Python NLP Service is unreachable or unhealthy (graceful degradation)');
            }
        }
        catch (err) {
            logger_1.logger.warn(`⚠️  Python NLP Service health ping failed: ${err?.message}`);
        }
        // Initialize Qdrant vector collections (graceful — ok if Qdrant is not running)
        try {
            await (0, qdrant_1.initQdrantCollections)();
            logger_1.logger.info('✅ Qdrant collections initialized');
        }
        catch (err) {
            logger_1.logger.warn(`⚠️  Qdrant unavailable: ${err?.message}. Semantic search will fall back to keyword matching.`);
        }
        // Start HTTP server
        const PORT = process.env.PORT || env_1.config.PORT || 5000;
        const server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${PORT} [${env_1.config.NODE_ENV}]`);
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