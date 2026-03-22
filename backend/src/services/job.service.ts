import { JobModel, IJob } from '../models/Job.model';
import { AnalysisModel } from '../models/Analysis.model';
import { AppError } from '../middleware/errorHandler';
import { cache } from '../config/redis';
import { logger } from '../config/logger';

interface JobMatchResult {
    job: IJob;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
}

export const jobService = {
    /**
     * Keyword-based job matching (fast, no vector DB required).
     * Used as the primary matching approach and fallback.
     */
    findMatches: async (userId: string, resumeId: string): Promise<JobMatchResult[]> => {
        const cacheKey = `job_matches:${resumeId}`;
        const cached = await cache.get<JobMatchResult[]>(cacheKey);
        if (cached) return cached;

        const analysis = await AnalysisModel.findOne({ resume: resumeId, user: userId, isLatest: true }).lean();
        if (!analysis?.nlpResult) {
            throw new AppError('Please analyze your resume first before finding job matches.', 400, 'NO_ANALYSIS');
        }

        const userSkills = new Set([
            ...analysis.nlpResult.extractedSkills.map((s) => s.toLowerCase()),
            ...analysis.nlpResult.softSkills.map((s) => s.toLowerCase()),
        ]);

        const jobs = await JobModel.find({ isActive: true }).limit(200).lean();

        const results: JobMatchResult[] = jobs
            .map((job) => {
                const jobSkills = [
                    ...job.requirements.map((s) => s.toLowerCase()),
                    ...job.preferredSkills.map((s) => s.toLowerCase()),
                ];
                const matched = jobSkills.filter((s) => userSkills.has(s));
                const missing = jobSkills.filter((s) => !userSkills.has(s)).slice(0, 10);
                const matchScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 0;
                return { job: job as unknown as IJob, matchScore, matchedSkills: matched, missingSkills: missing };
            })
            .filter((r) => r.matchScore > 20)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 20);

        await cache.set(cacheKey, results, 1800);
        return results;
    },

    /**
     * Semantic job matching using Qdrant vector cosine similarity search.
     * Falls back gracefully to an empty array if Qdrant is not running.
     * Results are cached in Redis for 30 minutes.
     */
    findSemanticMatches: async (_userId: string, resumeId: string, topN = 20) => {
        const cacheKey = `semantic_matches:${resumeId}`;
        const cached = await cache.get<any[]>(cacheKey);
        if (cached) return cached;

        try {
            const { findMatchingJobs } = await import('./vectorSearch.service');
            const matches = await findMatchingJobs(resumeId, topN);
            await cache.set(cacheKey, matches, 1800);
            return matches;
        } catch (err: any) {
            logger.warn(`[JobService] Qdrant semantic search failed: ${err?.message}. Return empty array.`);
            return [];
        }
    },

    search: async (query: string, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const filter = query
            ? { $text: { $search: query }, isActive: true }
            : { isActive: true };

        const [jobs, total] = await Promise.all([
            JobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            JobModel.countDocuments(filter),
        ]);
        return { jobs, total };
    },

    /**
     * Creates a new job posting and asynchronously indexes it in Qdrant.
     * The API response is not delayed by the vector DB write.
     */
    create: async (data: Partial<IJob>) => {
        const job = await JobModel.create(data);

        // Non-blocking vector indexing
        import('./vectorSearch.service').then(({ indexJob }) => {
            indexJob(job._id.toString()).catch((err) => {
                logger.warn(`[JobService] Failed to index job ${job._id} in Qdrant:`, err?.message);
            });
        });

        return job;
    },

    getById: async (id: string) => {
        const job = await JobModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).lean();
        if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
        return job;
    },
};
