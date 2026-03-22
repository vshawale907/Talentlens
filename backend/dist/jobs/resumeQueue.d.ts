import { Queue, QueueEvents } from 'bullmq';
/**
 * The main queue for all resume AI processing jobs.
 * Each job contains enough information for a background worker to
 * perform the NLP extraction and AI scoring without needing an HTTP request.
 */
export declare const resumeQueue: Queue<any, any, string, any, any, string>;
export declare const resumeQueueEvents: QueueEvents;
export interface ResumeJobData {
    resumeId: string;
    userId: string;
    jobDescriptionText?: string;
}
/**
 * Adds a resume analysis job to the queue.
 * Called immediately after a resume is uploaded and stored in MongoDB.
 */
export declare function enqueueResumeAnalysis(data: ResumeJobData): Promise<string>;
//# sourceMappingURL=resumeQueue.d.ts.map