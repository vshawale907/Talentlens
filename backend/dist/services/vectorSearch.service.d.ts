export interface JobMatchResult {
    jobId: string;
    score: number;
    title: string;
    company: string;
    location: string;
    type: string;
    experienceLevel: string;
    industry: string;
}
/**
 * Generates and stores a job embedding in Qdrant.
 * Call this whenever a new job is created or its description is updated.
 */
export declare function indexJob(jobId: string): Promise<void>;
/**
 * Generates and stores a resume embedding in Qdrant.
 * Called from the background worker after resume processing is complete.
 */
export declare function indexResume(resumeId: string, skills: string[]): Promise<void>;
/**
 * Uses the user's resume vector to find semantically similar active job postings.
 * Returns the top N jobs sorted by similarity score (0-1).
 */
export declare function findMatchingJobs(resumeId: string, topN?: number, minScore?: number): Promise<JobMatchResult[]>;
export declare function deleteResumeVector(resumeId: string): Promise<void>;
export declare function deleteJobVector(jobId: string): Promise<void>;
//# sourceMappingURL=vectorSearch.service.d.ts.map