"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexJob = indexJob;
exports.indexResume = indexResume;
exports.findMatchingJobs = findMatchingJobs;
exports.deleteResumeVector = deleteResumeVector;
exports.deleteJobVector = deleteJobVector;
const qdrant_1 = require("../config/qdrant");
const embedding_service_1 = require("./embedding.service");
const Job_model_1 = require("../models/Job.model");
const Resume_model_1 = require("../models/Resume.model");
const logger_1 = require("../config/logger");
// ─── Upsert a Job Vector ─────────────────────────────────────────────────────
/**
 * Generates and stores a job embedding in Qdrant.
 * Call this whenever a new job is created or its description is updated.
 */
async function indexJob(jobId) {
    const job = await Job_model_1.JobModel.findById(jobId).lean();
    if (!job) {
        logger_1.logger.warn(`[VectorSearch] Job ${jobId} not found, skipping indexing.`);
        return;
    }
    // Compose a rich text document for the embedding
    const jobText = [
        job.title,
        job.company,
        job.industry,
        job.description,
        ...(job.requirements || []),
        ...(job.preferredSkills || []),
        ...(job.tags || []),
    ].join(' ');
    const vector = await (0, embedding_service_1.generateEmbedding)(jobText);
    await qdrant_1.qdrantClient.upsert(qdrant_1.COLLECTION.JOBS, {
        wait: true,
        points: [
            {
                id: jobId,
                vector,
                payload: {
                    jobId,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    type: job.type,
                    experienceLevel: job.experienceLevel,
                    industry: job.industry,
                    isActive: job.isActive,
                },
            },
        ],
    });
    logger_1.logger.debug(`[VectorSearch] Indexed job ${jobId} (${job.title})`);
}
// ─── Upsert a Resume Vector ───────────────────────────────────────────────────
/**
 * Generates and stores a resume embedding in Qdrant.
 * Called from the background worker after resume processing is complete.
 */
async function indexResume(resumeId, skills) {
    const resume = await Resume_model_1.ResumeModel.findById(resumeId).lean();
    if (!resume)
        return;
    const resumeText = [resume.cleanedText, ...skills].join(' ');
    const vector = await (0, embedding_service_1.generateEmbedding)(resumeText);
    await qdrant_1.qdrantClient.upsert(qdrant_1.COLLECTION.RESUMES, {
        wait: true,
        points: [
            {
                id: resumeId,
                vector,
                payload: {
                    resumeId,
                    userId: resume.user.toString(),
                    skills,
                },
            },
        ],
    });
    logger_1.logger.debug(`[VectorSearch] Indexed resume ${resumeId}`);
}
// ─── Find Matching Jobs ───────────────────────────────────────────────────────
/**
 * Uses the user's resume vector to find semantically similar active job postings.
 * Returns the top N jobs sorted by similarity score (0-1).
 */
async function findMatchingJobs(resumeId, topN = 20, minScore = 0.55) {
    // Fetch resume vector from Qdrant
    const resumePoints = await qdrant_1.qdrantClient.retrieve(qdrant_1.COLLECTION.RESUMES, {
        ids: [resumeId],
        with_vector: true,
    });
    if (!resumePoints.length || !resumePoints[0].vector) {
        logger_1.logger.warn(`[VectorSearch] No vector found for resume ${resumeId}. Returning empty matches.`);
        return [];
    }
    const resumeVector = resumePoints[0].vector;
    // Semantic similarity search against all active jobs
    const results = await qdrant_1.qdrantClient.search(qdrant_1.COLLECTION.JOBS, {
        vector: resumeVector,
        limit: topN,
        score_threshold: minScore,
        filter: {
            must: [{ key: 'isActive', match: { value: true } }],
        },
        with_payload: true,
    });
    return results.map((r) => ({
        jobId: r.payload?.jobId,
        score: r.score,
        title: r.payload?.title,
        company: r.payload?.company,
        location: r.payload?.location,
        type: r.payload?.type,
        experienceLevel: r.payload?.experienceLevel,
        industry: r.payload?.industry,
    }));
}
// ─── Delete Resume Vector ─────────────────────────────────────────────────────
async function deleteResumeVector(resumeId) {
    await qdrant_1.qdrantClient.delete(qdrant_1.COLLECTION.RESUMES, {
        wait: true,
        points: [resumeId],
    });
    logger_1.logger.debug(`[VectorSearch] Deleted resume vector ${resumeId}`);
}
// ─── Delete Job Vector ────────────────────────────────────────────────────────
async function deleteJobVector(jobId) {
    await qdrant_1.qdrantClient.delete(qdrant_1.COLLECTION.JOBS, {
        wait: true,
        points: [jobId],
    });
    logger_1.logger.debug(`[VectorSearch] Deleted job vector ${jobId}`);
}
//# sourceMappingURL=vectorSearch.service.js.map