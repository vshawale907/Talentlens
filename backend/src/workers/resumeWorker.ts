import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { ResumeModel, ResumeStatus } from '../models/Resume.model';
import { AnalysisModel } from '../models/Analysis.model';
import { UserModel } from '../models/User.model';
import { nlpClient, NLPAnalysisResult } from '../services/nlp.client';
import { scoreResume, extractNLPDataFallback } from '../services/openai.service';
import { cache } from '../config/redis';
import { indexResume } from '../services/vectorSearch.service';
import type { ResumeJobData } from '../jobs/resumeQueue';

// ─── Worker ────────────────────────────────────────────────────────────────
export const startResumeWorker = (): Worker => {
    const worker = new Worker<ResumeJobData>(
        'resume-processing',
        async (job: Job<ResumeJobData>) => {
            const { resumeId, userId, jobDescriptionText } = job.data;
            logger.info(`[Worker] Processing resume job ${job.id} for resume ${resumeId}`);
            await job.updateProgress(10);

            const resume = await ResumeModel.findOne({ _id: resumeId, user: userId });
            if (!resume) {
                throw new Error(`Resume not found: ${resumeId}`);
            }

            const start = Date.now();
            await job.updateProgress(20);

            // ─── Step 1: NLP Extraction (Python microservice or LLM fallback) ───────
            let nlpResult: NLPAnalysisResult;
            try {
                logger.info(`[Worker] Calling NLP service for ${resumeId}...`);
                nlpResult = await nlpClient.analyzeResume({
                    resumeText: resume.cleanedText,
                    jobDescriptionText,
                });
            } catch {
                logger.warn(`[Worker] NLP service failed. Running LLM fallback for ${resumeId}...`);
                nlpResult = await extractNLPDataFallback(resume.cleanedText, jobDescriptionText);
            }
            await job.updateProgress(60);

            // ─── Step 2: AI Scoring ──────────────────────────────────────────────────
            let openAIResult = null;
            try {
                openAIResult = await scoreResume(resume.cleanedText, nlpResult, jobDescriptionText);
            } catch (err) {
                logger.error(`[Worker] AI scoring failed for ${resumeId}:`, err);
                // Continue with NLP-only data — don't fail the whole job
            }
            await job.updateProgress(85);

            const processingTimeMs = Date.now() - start;

            // ─── Step 3: Save to MongoDB ─────────────────────────────────────────────
            await AnalysisModel.updateMany({ resume: resumeId, isLatest: true }, { isLatest: false });
            const version = (await AnalysisModel.countDocuments({ resume: resumeId })) + 1;

            // Sanitize keyword density keys
            if (nlpResult.keywordDensity && typeof nlpResult.keywordDensity === 'object') {
                nlpResult.keywordDensity = Object.fromEntries(
                    Object.entries(nlpResult.keywordDensity).map(([k, v]) => [k.replace(/\./g, '_'), v])
                ) as any;
            }

            const analysisPayload: Record<string, unknown> = {
                user: userId,
                resume: resumeId,
                jobDescriptionText,
                nlpResult,
                processingTimeMs,
                aiModel: config.OPENAI_MODEL,
                isLatest: true,
                version,
            };
            if (openAIResult) analysisPayload.openAIResult = openAIResult;

            const analysis = await AnalysisModel.create(analysisPayload);

            // ─── Step 4: Update database status ─────────────────────────────────────
            await Promise.all([
                ResumeModel.findByIdAndUpdate(resumeId, { status: ResumeStatus.ANALYZED }),
                UserModel.findByIdAndUpdate(userId, { $inc: { analysisCount: 1 } }),
            ]);

            // ─── Step 5: Cache the result ────────────────────────────────────────────
            const cacheKey = `analysis:${resumeId}:${jobDescriptionText ? 'jd' : 'nojd'}`;
            const cacheTTL = openAIResult ? 3600 : 30;
            await cache.set(cacheKey, analysis, cacheTTL);

            // ─── Step 6: Index resume vector in Qdrant ──────────────────────────────
            try {
                await indexResume(resumeId, nlpResult.extractedSkills || []);
            } catch (vectorErr) {
                // Non-fatal: vector indexing failure should not block resume analysis
                logger.warn(`[Worker] Failed to index resume vector for ${resumeId}:`, vectorErr);
            }

            await job.updateProgress(100);
            logger.info(`[Worker] Resume ${resumeId} analyzed in ${processingTimeMs}ms`);

            return { analysisId: analysis._id, processingTimeMs };
        },
        {
            connection: { url: config.REDIS_URL },
            concurrency: 5,       // Process up to 5 resumes at once per worker instance
            limiter: {
                max: 10,          // Max 10 jobs per 10 seconds (global rate limit to protect AI APIs)
                duration: 10000,
            },
        }
    );

    worker.on('completed', (job) => {
        logger.info(`[Worker] Job ${job.id} completed.`);
    });

    worker.on('failed', async (job, err) => {
        if (!job) return;
        logger.error(`[Worker] Job ${job.id} failed permanently: ${err.message}`);
        // Mark resume as failed in DB so the UI can show the error state
        await ResumeModel.findByIdAndUpdate(job.data.resumeId, {
            status: ResumeStatus.ERROR,
        });
    });

    logger.info('[Worker] Resume processing worker started.');
    return worker;
};
