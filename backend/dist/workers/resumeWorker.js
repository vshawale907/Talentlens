"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startResumeWorker = void 0;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const Resume_model_1 = require("../models/Resume.model");
const Analysis_model_1 = require("../models/Analysis.model");
const User_model_1 = require("../models/User.model");
const nlp_client_1 = require("../services/nlp.client");
const openai_service_1 = require("../services/openai.service");
const redis_1 = require("../config/redis");
const vectorSearch_service_1 = require("../services/vectorSearch.service");
// ─── Worker ────────────────────────────────────────────────────────────────
const startResumeWorker = () => {
    const worker = new bullmq_1.Worker('resume-processing', async (job) => {
        const { resumeId, userId, jobDescriptionText } = job.data;
        logger_1.logger.info(`[Worker] Processing resume job ${job.id} for resume ${resumeId}`);
        await job.updateProgress(10);
        const resume = await Resume_model_1.ResumeModel.findOne({ _id: resumeId, user: userId });
        if (!resume) {
            throw new Error(`Resume not found: ${resumeId}`);
        }
        const start = Date.now();
        await job.updateProgress(20);
        // ─── Step 1: NLP Extraction (Python microservice or LLM fallback) ───────
        let nlpResult;
        try {
            logger_1.logger.info(`[Worker] Calling NLP service for ${resumeId}...`);
            nlpResult = await nlp_client_1.nlpClient.analyzeResume({
                resumeText: resume.cleanedText,
                jobDescriptionText,
            });
        }
        catch {
            logger_1.logger.warn(`[Worker] NLP service failed. Running LLM fallback for ${resumeId}...`);
            nlpResult = await (0, openai_service_1.extractNLPDataFallback)(resume.cleanedText, jobDescriptionText);
        }
        await job.updateProgress(60);
        // ─── Step 2: AI Scoring ──────────────────────────────────────────────────
        let openAIResult = null;
        try {
            openAIResult = await (0, openai_service_1.scoreResume)(resume.cleanedText, nlpResult, jobDescriptionText);
        }
        catch (err) {
            logger_1.logger.error(`[Worker] AI scoring failed for ${resumeId}:`, err);
            // Continue with NLP-only data — don't fail the whole job
        }
        await job.updateProgress(85);
        const processingTimeMs = Date.now() - start;
        // ─── Step 3: Save to MongoDB ─────────────────────────────────────────────
        await Analysis_model_1.AnalysisModel.updateMany({ resume: resumeId, isLatest: true }, { isLatest: false });
        const version = (await Analysis_model_1.AnalysisModel.countDocuments({ resume: resumeId })) + 1;
        // Sanitize keyword density keys
        if (nlpResult.keywordDensity && typeof nlpResult.keywordDensity === 'object') {
            nlpResult.keywordDensity = Object.fromEntries(Object.entries(nlpResult.keywordDensity).map(([k, v]) => [k.replace(/\./g, '_'), v]));
        }
        const analysisPayload = {
            user: userId,
            resume: resumeId,
            jobDescriptionText,
            nlpResult,
            processingTimeMs,
            aiModel: env_1.config.OPENAI_MODEL,
            isLatest: true,
            version,
        };
        if (openAIResult)
            analysisPayload.openAIResult = openAIResult;
        const analysis = await Analysis_model_1.AnalysisModel.create(analysisPayload);
        // ─── Step 4: Update database status ─────────────────────────────────────
        await Promise.all([
            Resume_model_1.ResumeModel.findByIdAndUpdate(resumeId, { status: Resume_model_1.ResumeStatus.ANALYZED }),
            User_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { analysisCount: 1 } }),
        ]);
        // ─── Step 5: Cache the result ────────────────────────────────────────────
        const cacheKey = `analysis:${resumeId}:${jobDescriptionText ? 'jd' : 'nojd'}`;
        const cacheTTL = openAIResult ? 3600 : 30;
        await redis_1.cache.set(cacheKey, analysis, cacheTTL);
        // ─── Step 6: Index resume vector in Qdrant ──────────────────────────────
        try {
            await (0, vectorSearch_service_1.indexResume)(resumeId, nlpResult.extractedSkills || []);
        }
        catch (vectorErr) {
            // Non-fatal: vector indexing failure should not block resume analysis
            logger_1.logger.warn(`[Worker] Failed to index resume vector for ${resumeId}:`, vectorErr);
        }
        await job.updateProgress(100);
        logger_1.logger.info(`[Worker] Resume ${resumeId} analyzed in ${processingTimeMs}ms`);
        return { analysisId: analysis._id, processingTimeMs };
    }, {
        connection: { url: env_1.config.REDIS_URL },
        concurrency: 5, // Process up to 5 resumes at once per worker instance
        limiter: {
            max: 10, // Max 10 jobs per 10 seconds (global rate limit to protect AI APIs)
            duration: 10000,
        },
    });
    worker.on('completed', (job) => {
        logger_1.logger.info(`[Worker] Job ${job.id} completed.`);
    });
    worker.on('failed', async (job, err) => {
        if (!job)
            return;
        logger_1.logger.error(`[Worker] Job ${job.id} failed permanently: ${err.message}`);
        // Mark resume as failed in DB so the UI can show the error state
        await Resume_model_1.ResumeModel.findByIdAndUpdate(job.data.resumeId, {
            status: Resume_model_1.ResumeStatus.ERROR,
        });
    });
    logger_1.logger.info('[Worker] Resume processing worker started.');
    return worker;
};
exports.startResumeWorker = startResumeWorker;
//# sourceMappingURL=resumeWorker.js.map