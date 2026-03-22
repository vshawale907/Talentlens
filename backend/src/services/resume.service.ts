import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xss from 'xss';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { ResumeModel, ResumeStatus } from '../models/Resume.model';
import { AnalysisModel } from '../models/Analysis.model';
import { UserModel } from '../models/User.model';
import { nlpClient, NLPAnalysisResult } from './nlp.client';
import { scoreResume, extractNLPDataFallback } from './openai.service';
import { cache } from '../config/redis';
import { logger } from '../config/logger';
import { uploadToS3, deleteFromS3 } from '../config/s3';
import { enqueueResumeAnalysis } from '../jobs/resumeQueue';

// ─── Multer Storage ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.resolve(config.UPLOAD_DIR);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        cb(new AppError('Only PDF and DOCX files are allowed', 400, 'INVALID_FILE_TYPE'));
        return;
    }
    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// ─── Text Extraction ───────────────────────────────────────────────────────
const extractText = async (filePath: string, fileType: string): Promise<string> => {
    if (fileType === 'pdf') {
        const buffer = fs.readFileSync(filePath);
        const result = await pdfParse(buffer);
        return result.text;
    }

    if (fileType === 'docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    throw new AppError('Unsupported file type', 400, 'UNSUPPORTED_FILE');
};

// ─── Text Cleaning ─────────────────────────────────────────────────────────
const cleanText = (raw: string): string => {
    return xss(raw)
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

// ─── Resume Service ────────────────────────────────────────────────────────
export const resumeService = {
    upload: async (
        userId: string,
        file: Express.Multer.File,
        title?: string
    ) => {
        const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
        const rawText = await extractText(file.path, fileExt);
        const cleanedText = cleanText(rawText);

        if (cleanedText.length < 100) {
            fs.unlinkSync(file.path);
            throw new AppError('Resume text is too short. Please upload a valid resume.', 400, 'INSUFFICIENT_CONTENT');
        }

        const fileBuffer = fs.readFileSync(file.path);
        const fileKey = `resumes/${userId}/${uuidv4()}.${fileExt}`;
        await uploadToS3(fileBuffer, file.mimetype, fileKey);

        // Remove local file
        fs.unlinkSync(file.path);

        const resume = await ResumeModel.create({
            user: userId,
            title: title || file.originalname.replace(/\.[^.]+$/, ''),
            originalFilename: file.originalname,
            fileType: fileExt,
            fileSize: file.size,
            fileKey,
            rawText,
            cleanedText,
            status: ResumeStatus.PROCESSING,
        });

        // Increment user resume count
        await UserModel.findByIdAndUpdate(userId, { $inc: { resumeCount: 1 } });

        // Dispatch analysis to background worker queue (non-blocking)
        const jobId = await enqueueResumeAnalysis({ resumeId: resume._id.toString(), userId });
        logger.info(`Resume uploaded: ${resume._id} by user ${userId}. Analysis job ${jobId} queued.`);
        return resume;
    },

    analyze: async (resumeId: string, userId: string, jobDescriptionText?: string) => {
        const cacheKey = `analysis:${resumeId}:${jobDescriptionText ? 'jd' : 'nojd'}`;
        const cached = await cache.get(cacheKey);
        if (cached) {
            logger.debug(`Cache hit for analysis: ${resumeId}`);
            return cached;
        }

        const resume = await ResumeModel.findOne({ _id: resumeId, user: userId });
        if (!resume) throw new AppError('Resume not found', 404, 'NOT_FOUND');

        const start = Date.now();

        // Step 1: Python NLP microservice (with fallback)
        let nlpResult: NLPAnalysisResult;
        logger.info(`[Analysis ${resumeId}] Calling NLP service...`);
        try {
            nlpResult = await nlpClient.analyzeResume({
                resumeText: resume.cleanedText,
                jobDescriptionText,
            });
        } catch (error) {
            logger.warn(`[Analysis ${resumeId}] NLP service failed or unavailable. Falling back to LLM extraction...`);
            try {
                // Trigger the fallback to use Gemini/OpenAI
                nlpResult = await extractNLPDataFallback(resume.cleanedText, jobDescriptionText);
            } catch (fallbackError) {
                logger.error(`[Analysis ${resumeId}] LLM Fallback also failed:`, fallbackError);
                throw new AppError('Both primary NLP and fallback AI services failed. Please try again later.', 502, 'ALL_AI_SERVICES_DOWN');
            }
        }

        // Step 2: AI scoring — wrap so quota/model errors surface as friendly AppError
        let openAIResult: Awaited<ReturnType<typeof scoreResume>> | null = null;
        try {
            openAIResult = await scoreResume(resume.cleanedText, nlpResult, jobDescriptionText);
        } catch (scoringError) {
            const errMsg = (scoringError as { message?: string })?.message ?? 'Unknown error';
            logger.error(`[Analysis ${resumeId}] AI scoring failed: ${errMsg}`);
            // Re-throw as a clean AppError so the client sees a friendly message
            if (scoringError instanceof AppError) throw scoringError;
            throw new AppError(
                'AI analysis failed. Please wait a moment and try again.',
                502,
                'AI_SCORING_FAILED'
            );
        }
        const openAIWasRateLimited = openAIResult === null;

        const processingTimeMs = Date.now() - start;

        // Mark older analyses as non-latest
        await AnalysisModel.updateMany({ resume: resumeId, isLatest: true }, { isLatest: false });

        const version = (await AnalysisModel.countDocuments({ resume: resumeId })) + 1;

        // Sanitize keywordDensity to prevent Mongoose map errors with dots in keys
        if (nlpResult.keywordDensity) {
            // Mongoose casting map requires objects
            if (typeof nlpResult.keywordDensity === 'string') {
                try { nlpResult.keywordDensity = JSON.parse(nlpResult.keywordDensity) } catch (e) { }
            }
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

        // Update resume status
        await ResumeModel.findByIdAndUpdate(resumeId, { status: ResumeStatus.ANALYZED });
        await UserModel.findByIdAndUpdate(userId, { $inc: { analysisCount: 1 } });

        // Only cache "complete" analyses for longer. If OpenAI was rate-limited, keep cache short
        // so the user can retry soon without waiting an hour.
        await cache.set(cacheKey, analysis, openAIWasRateLimited ? 30 : 3600);
        logger.info(
            `[Analysis ${resumeId}] Complete in ${processingTimeMs}ms` +
            (openAIWasRateLimited ? ' (NLP-only; OpenAI rate-limited)' : '')
        );
        return analysis;
    },

    getByUser: async (userId: string, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const [resumes, total] = await Promise.all([
            ResumeModel.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ResumeModel.countDocuments({ user: userId }),
        ]);
        return { resumes, total };
    },

    delete: async (resumeId: string, userId: string) => {
        const resume = await ResumeModel.findOne({ _id: resumeId, user: userId });
        if (!resume) throw new AppError('Resume not found', 404, 'NOT_FOUND');

        // Delete file from disk if it exists (legacy path)
        if ((resume as any).filePath && fs.existsSync((resume as any).filePath)) fs.unlinkSync((resume as any).filePath);

        // Delete from S3
        if (resume.fileKey) {
            await deleteFromS3(resume.fileKey);
        }

        await Promise.all([
            ResumeModel.deleteOne({ _id: resumeId }),
            AnalysisModel.deleteMany({ resume: resumeId }),
        ]);

        await UserModel.findByIdAndUpdate(userId, { $inc: { resumeCount: -1 } });
        await cache.invalidatePattern(`analysis:${resumeId}:*`);
        logger.info(`Resume deleted: ${resumeId}`);
    },
};
