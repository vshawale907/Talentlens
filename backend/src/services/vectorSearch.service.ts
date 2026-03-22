import { qdrantClient, COLLECTION } from '../config/qdrant';
import { generateEmbedding } from './embedding.service';
import { JobModel } from '../models/Job.model';
import { ResumeModel } from '../models/Resume.model';
import { logger } from '../config/logger';

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

// ─── Upsert a Job Vector ─────────────────────────────────────────────────────
/**
 * Generates and stores a job embedding in Qdrant.
 * Call this whenever a new job is created or its description is updated.
 */
export async function indexJob(jobId: string): Promise<void> {
    const job = await JobModel.findById(jobId).lean();
    if (!job) {
        logger.warn(`[VectorSearch] Job ${jobId} not found, skipping indexing.`);
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

    const vector = await generateEmbedding(jobText);

    await qdrantClient.upsert(COLLECTION.JOBS, {
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

    logger.debug(`[VectorSearch] Indexed job ${jobId} (${job.title})`);
}

// ─── Upsert a Resume Vector ───────────────────────────────────────────────────
/**
 * Generates and stores a resume embedding in Qdrant.
 * Called from the background worker after resume processing is complete.
 */
export async function indexResume(resumeId: string, skills: string[]): Promise<void> {
    const resume = await ResumeModel.findById(resumeId).lean();
    if (!resume) return;

    const resumeText = [resume.cleanedText, ...skills].join(' ');
    const vector = await generateEmbedding(resumeText);

    await qdrantClient.upsert(COLLECTION.RESUMES, {
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

    logger.debug(`[VectorSearch] Indexed resume ${resumeId}`);
}

// ─── Find Matching Jobs ───────────────────────────────────────────────────────
/**
 * Uses the user's resume vector to find semantically similar active job postings.
 * Returns the top N jobs sorted by similarity score (0-1).
 */
export async function findMatchingJobs(
    resumeId: string,
    topN = 20,
    minScore = 0.55
): Promise<JobMatchResult[]> {
    // Fetch resume vector from Qdrant
    const resumePoints = await qdrantClient.retrieve(COLLECTION.RESUMES, {
        ids: [resumeId],
        with_vector: true,
    });

    if (!resumePoints.length || !resumePoints[0].vector) {
        logger.warn(`[VectorSearch] No vector found for resume ${resumeId}. Returning empty matches.`);
        return [];
    }

    const resumeVector = resumePoints[0].vector as number[];

    // Semantic similarity search against all active jobs
    const results = await qdrantClient.search(COLLECTION.JOBS, {
        vector: resumeVector,
        limit: topN,
        score_threshold: minScore,
        filter: {
            must: [{ key: 'isActive', match: { value: true } }],
        },
        with_payload: true,
    });

    return results.map((r) => ({
        jobId: r.payload?.jobId as string,
        score: r.score,
        title: r.payload?.title as string,
        company: r.payload?.company as string,
        location: r.payload?.location as string,
        type: r.payload?.type as string,
        experienceLevel: r.payload?.experienceLevel as string,
        industry: r.payload?.industry as string,
    }));
}

// ─── Delete Resume Vector ─────────────────────────────────────────────────────
export async function deleteResumeVector(resumeId: string): Promise<void> {
    await qdrantClient.delete(COLLECTION.RESUMES, {
        wait: true,
        points: [resumeId],
    });
    logger.debug(`[VectorSearch] Deleted resume vector ${resumeId}`);
}

// ─── Delete Job Vector ────────────────────────────────────────────────────────
export async function deleteJobVector(jobId: string): Promise<void> {
    await qdrantClient.delete(COLLECTION.JOBS, {
        wait: true,
        points: [jobId],
    });
    logger.debug(`[VectorSearch] Deleted job vector ${jobId}`);
}
