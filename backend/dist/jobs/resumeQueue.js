"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeQueueEvents = exports.resumeQueue = void 0;
exports.enqueueResumeAnalysis = enqueueResumeAnalysis;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
// ─── Connection Options ────────────────────────────────────────────────────
// BullMQ requires a dedicated Redis connection (not shared with ioredis cache client)
const redisConnection = {
    url: env_1.config.REDIS_URL,
};
// ─── Queue Definition ─────────────────────────────────────────────────────
/**
 * The main queue for all resume AI processing jobs.
 * Each job contains enough information for a background worker to
 * perform the NLP extraction and AI scoring without needing an HTTP request.
 */
exports.resumeQueue = new bullmq_1.Queue('resume-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: { age: 3600, count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { age: 24 * 3600 }, // Keep failed jobs for 24h for debugging
    },
});
// ─── Queue Events (for logging) ───────────────────────────────────────────
exports.resumeQueueEvents = new bullmq_1.QueueEvents('resume-processing', {
    connection: redisConnection,
});
exports.resumeQueueEvents.on('completed', ({ jobId }) => {
    logger_1.logger.info(`[Queue] Resume job ${jobId} completed successfully.`);
});
exports.resumeQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger_1.logger.error(`[Queue] Resume job ${jobId} failed: ${failedReason}`);
});
/**
 * Adds a resume analysis job to the queue.
 * Called immediately after a resume is uploaded and stored in MongoDB.
 */
async function enqueueResumeAnalysis(data) {
    const job = await exports.resumeQueue.add('analyze', data, {
        priority: 1,
    });
    logger_1.logger.info(`[Queue] Enqueued resume analysis job ${job.id} for resume ${data.resumeId}`);
    return job.id;
}
//# sourceMappingURL=resumeQueue.js.map