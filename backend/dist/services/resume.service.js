"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeService = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const xss_1 = __importDefault(require("xss"));
const env_1 = require("../config/env");
const errorHandler_1 = require("../middleware/errorHandler");
const Resume_model_1 = require("../models/Resume.model");
const Analysis_model_1 = require("../models/Analysis.model");
const User_model_1 = require("../models/User.model");
const nlp_client_1 = require("./nlp.client");
const openai_service_1 = require("./openai.service");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const s3_1 = require("../config/s3");
const resumeQueue_1 = require("../jobs/resumeQueue");
// ─── Multer Storage ────────────────────────────────────────────────────────
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.resolve(env_1.config.UPLOAD_DIR);
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        cb(new errorHandler_1.AppError('Only PDF and DOCX files are allowed', 400, 'INVALID_FILE_TYPE'));
        return;
    }
    cb(null, true);
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: env_1.config.MAX_FILE_SIZE_MB * 1024 * 1024 },
});
// ─── Text Extraction ───────────────────────────────────────────────────────
const extractText = async (filePath, fileType) => {
    if (fileType === 'pdf') {
        const buffer = fs_1.default.readFileSync(filePath);
        const result = await (0, pdf_parse_1.default)(buffer);
        return result.text;
    }
    if (fileType === 'docx') {
        const result = await mammoth_1.default.extractRawText({ path: filePath });
        return result.value;
    }
    throw new errorHandler_1.AppError('Unsupported file type', 400, 'UNSUPPORTED_FILE');
};
// ─── Text Cleaning ─────────────────────────────────────────────────────────
const cleanText = (raw) => {
    return (0, xss_1.default)(raw)
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};
// ─── Resume Service ────────────────────────────────────────────────────────
exports.resumeService = {
    upload: async (userId, file, title) => {
        const fileExt = path_1.default.extname(file.originalname).toLowerCase().replace('.', '');
        const rawText = await extractText(file.path, fileExt);
        const cleanedText = cleanText(rawText);
        if (cleanedText.length < 100) {
            fs_1.default.unlinkSync(file.path);
            throw new errorHandler_1.AppError('Resume text is too short. Please upload a valid resume.', 400, 'INSUFFICIENT_CONTENT');
        }
        const fileBuffer = fs_1.default.readFileSync(file.path);
        const fileKey = `resumes/${userId}/${(0, uuid_1.v4)()}.${fileExt}`;
        await (0, s3_1.uploadToS3)(fileBuffer, file.mimetype, fileKey);
        // Remove local file
        fs_1.default.unlinkSync(file.path);
        const resume = await Resume_model_1.ResumeModel.create({
            user: userId,
            title: title || file.originalname.replace(/\.[^.]+$/, ''),
            originalFilename: file.originalname,
            fileType: fileExt,
            fileSize: file.size,
            fileKey,
            rawText,
            cleanedText,
            status: Resume_model_1.ResumeStatus.PROCESSING,
        });
        // Increment user resume count
        await User_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { resumeCount: 1 } });
        // Dispatch analysis to background worker queue (non-blocking)
        const jobId = await (0, resumeQueue_1.enqueueResumeAnalysis)({ resumeId: resume._id.toString(), userId });
        logger_1.logger.info(`Resume uploaded: ${resume._id} by user ${userId}. Analysis job ${jobId} queued.`);
        return resume;
    },
    analyze: async (resumeId, userId, jobDescriptionText) => {
        const cacheKey = `analysis:${resumeId}:${jobDescriptionText ? 'jd' : 'nojd'}`;
        const cached = await redis_1.cache.get(cacheKey);
        if (cached) {
            logger_1.logger.debug(`Cache hit for analysis: ${resumeId}`);
            return cached;
        }
        const resume = await Resume_model_1.ResumeModel.findOne({ _id: resumeId, user: userId });
        if (!resume)
            throw new errorHandler_1.AppError('Resume not found', 404, 'NOT_FOUND');
        const start = Date.now();
        // Step 1: Python NLP microservice (with fallback)
        let nlpResult;
        logger_1.logger.info(`[Analysis ${resumeId}] Calling NLP service...`);
        try {
            nlpResult = await nlp_client_1.nlpClient.analyzeResume({
                resumeText: resume.cleanedText,
                jobDescriptionText,
            });
        }
        catch (error) {
            logger_1.logger.warn(`[Analysis ${resumeId}] NLP service failed or unavailable. Falling back to LLM extraction...`);
            try {
                // Trigger the fallback to use Gemini/OpenAI
                nlpResult = await (0, openai_service_1.extractNLPDataFallback)(resume.cleanedText, jobDescriptionText);
            }
            catch (fallbackError) {
                logger_1.logger.error(`[Analysis ${resumeId}] LLM Fallback also failed:`, fallbackError);
                throw new errorHandler_1.AppError('Both primary NLP and fallback AI services failed. Please try again later.', 502, 'ALL_AI_SERVICES_DOWN');
            }
        }
        // Step 2: AI scoring — wrap so quota/model errors surface as friendly AppError
        let openAIResult = null;
        try {
            openAIResult = await (0, openai_service_1.scoreResume)(resume.cleanedText, nlpResult, jobDescriptionText);
        }
        catch (scoringError) {
            const errMsg = scoringError?.message ?? 'Unknown error';
            logger_1.logger.error(`[Analysis ${resumeId}] AI scoring failed: ${errMsg}`);
            // Re-throw as a clean AppError so the client sees a friendly message
            if (scoringError instanceof errorHandler_1.AppError)
                throw scoringError;
            throw new errorHandler_1.AppError('AI analysis failed. Please wait a moment and try again.', 502, 'AI_SCORING_FAILED');
        }
        const openAIWasRateLimited = openAIResult === null;
        const processingTimeMs = Date.now() - start;
        // Mark older analyses as non-latest
        await Analysis_model_1.AnalysisModel.updateMany({ resume: resumeId, isLatest: true }, { isLatest: false });
        const version = (await Analysis_model_1.AnalysisModel.countDocuments({ resume: resumeId })) + 1;
        // Sanitize keywordDensity to prevent Mongoose map errors with dots in keys
        if (nlpResult.keywordDensity) {
            // Mongoose casting map requires objects
            if (typeof nlpResult.keywordDensity === 'string') {
                try {
                    nlpResult.keywordDensity = JSON.parse(nlpResult.keywordDensity);
                }
                catch (e) { }
            }
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
        // Update resume status
        await Resume_model_1.ResumeModel.findByIdAndUpdate(resumeId, { status: Resume_model_1.ResumeStatus.ANALYZED });
        await User_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { analysisCount: 1 } });
        // Only cache "complete" analyses for longer. If OpenAI was rate-limited, keep cache short
        // so the user can retry soon without waiting an hour.
        await redis_1.cache.set(cacheKey, analysis, openAIWasRateLimited ? 30 : 3600);
        logger_1.logger.info(`[Analysis ${resumeId}] Complete in ${processingTimeMs}ms` +
            (openAIWasRateLimited ? ' (NLP-only; OpenAI rate-limited)' : ''));
        return analysis;
    },
    getByUser: async (userId, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const [resumes, total] = await Promise.all([
            Resume_model_1.ResumeModel.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Resume_model_1.ResumeModel.countDocuments({ user: userId }),
        ]);
        return { resumes, total };
    },
    delete: async (resumeId, userId) => {
        const resume = await Resume_model_1.ResumeModel.findOne({ _id: resumeId, user: userId });
        if (!resume)
            throw new errorHandler_1.AppError('Resume not found', 404, 'NOT_FOUND');
        // Delete file from disk if it exists (legacy path)
        if (resume.filePath && fs_1.default.existsSync(resume.filePath))
            fs_1.default.unlinkSync(resume.filePath);
        // Delete from S3
        if (resume.fileKey) {
            await (0, s3_1.deleteFromS3)(resume.fileKey);
        }
        await Promise.all([
            Resume_model_1.ResumeModel.deleteOne({ _id: resumeId }),
            Analysis_model_1.AnalysisModel.deleteMany({ resume: resumeId }),
        ]);
        await User_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { resumeCount: -1 } });
        await redis_1.cache.invalidatePattern(`analysis:${resumeId}:*`);
        logger_1.logger.info(`Resume deleted: ${resumeId}`);
    },
};
//# sourceMappingURL=resume.service.js.map