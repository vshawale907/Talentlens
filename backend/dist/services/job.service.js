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
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobService = void 0;
const Job_model_1 = require("../models/Job.model");
const Analysis_model_1 = require("../models/Analysis.model");
const errorHandler_1 = require("../middleware/errorHandler");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
exports.jobService = {
    /**
     * Keyword-based job matching (fast, no vector DB required).
     * Used as the primary matching approach and fallback.
     */
    findMatches: async (userId, resumeId) => {
        const cacheKey = `job_matches:${resumeId}`;
        const cached = await redis_1.cache.get(cacheKey);
        if (cached)
            return cached;
        const analysis = await Analysis_model_1.AnalysisModel.findOne({ resume: resumeId, user: userId, isLatest: true }).lean();
        if (!analysis?.nlpResult) {
            throw new errorHandler_1.AppError('Please analyze your resume first before finding job matches.', 400, 'NO_ANALYSIS');
        }
        const userSkills = new Set([
            ...analysis.nlpResult.extractedSkills.map((s) => s.toLowerCase()),
            ...analysis.nlpResult.softSkills.map((s) => s.toLowerCase()),
        ]);
        const jobs = await Job_model_1.JobModel.find({ isActive: true }).limit(200).lean();
        const results = jobs
            .map((job) => {
            const jobSkills = [
                ...job.requirements.map((s) => s.toLowerCase()),
                ...job.preferredSkills.map((s) => s.toLowerCase()),
            ];
            const matched = jobSkills.filter((s) => userSkills.has(s));
            const missing = jobSkills.filter((s) => !userSkills.has(s)).slice(0, 10);
            const matchScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 0;
            return { job: job, matchScore, matchedSkills: matched, missingSkills: missing };
        })
            .filter((r) => r.matchScore > 20)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 20);
        await redis_1.cache.set(cacheKey, results, 1800);
        return results;
    },
    /**
     * Semantic job matching using Qdrant vector cosine similarity search.
     * Falls back gracefully to an empty array if Qdrant is not running.
     * Results are cached in Redis for 30 minutes.
     */
    findSemanticMatches: async (_userId, resumeId, topN = 20) => {
        const cacheKey = `semantic_matches:${resumeId}`;
        const cached = await redis_1.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const { findMatchingJobs } = await Promise.resolve().then(() => __importStar(require('./vectorSearch.service')));
            const matches = await findMatchingJobs(resumeId, topN);
            await redis_1.cache.set(cacheKey, matches, 1800);
            return matches;
        }
        catch (err) {
            logger_1.logger.warn(`[JobService] Qdrant semantic search failed: ${err?.message}. Return empty array.`);
            return [];
        }
    },
    search: async (query, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const filter = query
            ? { $text: { $search: query }, isActive: true }
            : { isActive: true };
        const [jobs, total] = await Promise.all([
            Job_model_1.JobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Job_model_1.JobModel.countDocuments(filter),
        ]);
        return { jobs, total };
    },
    /**
     * Creates a new job posting and asynchronously indexes it in Qdrant.
     * The API response is not delayed by the vector DB write.
     */
    create: async (data) => {
        const job = await Job_model_1.JobModel.create(data);
        // Non-blocking vector indexing
        Promise.resolve().then(() => __importStar(require('./vectorSearch.service'))).then(({ indexJob }) => {
            indexJob(job._id.toString()).catch((err) => {
                logger_1.logger.warn(`[JobService] Failed to index job ${job._id} in Qdrant:`, err?.message);
            });
        });
        return job;
    },
    getById: async (id) => {
        const job = await Job_model_1.JobModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).lean();
        if (!job)
            throw new errorHandler_1.AppError('Job not found', 404, 'NOT_FOUND');
        return job;
    },
};
//# sourceMappingURL=job.service.js.map