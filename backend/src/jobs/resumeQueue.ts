import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config/env';
import { logger } from '../config/logger';

// ─── Connection Options ────────────────────────────────────────────────────
// BullMQ requires a dedicated Redis connection (not shared with ioredis cache client)
const redisConnection = {
    url: config.REDIS_URL,
};

// ─── Queue Definition ─────────────────────────────────────────────────────
/**
 * The main queue for all resume AI processing jobs.
 * Each job contains enough information for a background worker to
 * perform the NLP extraction and AI scoring without needing an HTTP request.
 */
export const resumeQueue = new Queue('resume-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: { age: 3600, count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { age: 24 * 3600 },            // Keep failed jobs for 24h for debugging
    },
});

// ─── Queue Events (for logging) ───────────────────────────────────────────
export const resumeQueueEvents = new QueueEvents('resume-processing', {
    connection: redisConnection,
});

resumeQueueEvents.on('completed', ({ jobId }) => {
    logger.info(`[Queue] Resume job ${jobId} completed successfully.`);
});

resumeQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`[Queue] Resume job ${jobId} failed: ${failedReason}`);
});

// ─── Job Types ────────────────────────────────────────────────────────────
export interface ResumeJobData {
    resumeId: string;
    userId: string;
    jobDescriptionText?: string;
}

/**
 * Adds a resume analysis job to the queue.
 * Called immediately after a resume is uploaded and stored in MongoDB.
 */
export async function enqueueResumeAnalysis(data: ResumeJobData): Promise<string> {
    const job = await resumeQueue.add('analyze', data, {
        priority: 1,
    });
    logger.info(`[Queue] Enqueued resume analysis job ${job.id} for resume ${data.resumeId}`);
    return job.id!;
}
