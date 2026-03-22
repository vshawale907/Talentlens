import { IJob } from '../models/Job.model';
interface JobMatchResult {
    job: IJob;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
}
export declare const jobService: {
    /**
     * Keyword-based job matching (fast, no vector DB required).
     * Used as the primary matching approach and fallback.
     */
    findMatches: (userId: string, resumeId: string) => Promise<JobMatchResult[]>;
    /**
     * Semantic job matching using Qdrant vector cosine similarity search.
     * Falls back gracefully to an empty array if Qdrant is not running.
     * Results are cached in Redis for 30 minutes.
     */
    findSemanticMatches: (_userId: string, resumeId: string, topN?: number) => Promise<any[]>;
    search: (query: string, page?: number, limit?: number) => Promise<{
        jobs: (import("mongoose").FlattenMaps<IJob> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
    }>;
    /**
     * Creates a new job posting and asynchronously indexes it in Qdrant.
     * The API response is not delayed by the vector DB write.
     */
    create: (data: Partial<IJob>) => Promise<import("mongoose").Document<unknown, {}, IJob, {}, {}> & IJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getById: (id: string) => Promise<import("mongoose").FlattenMaps<IJob> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
};
export {};
//# sourceMappingURL=job.service.d.ts.map