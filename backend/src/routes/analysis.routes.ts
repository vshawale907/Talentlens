import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { AnalysisModel } from '../models/Analysis.model';
import { generateInterviewQuestions, generateCoverLetter, generateCareerRoadmap, generateCustomCoverLetter } from '../services/openai.service';
import { NotFoundError, AppError } from '../middleware/errorHandler';
import { cache } from '../config/redis';

const router = Router();
router.use(authenticate);

// GET /api/v1/analysis/:resumeId/latest
router.get('/:resumeId/latest', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const analysis = await AnalysisModel.findOne({
            resume: req.params.resumeId,
            user: req.user!.id,
            isLatest: true,
        }).lean();
        if (!analysis) throw new NotFoundError('Analysis');
        res.success({ analysis });
    } catch (err) { next(err); }
});

// GET /api/v1/analysis/:resumeId/history
router.get('/:resumeId/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const history = await AnalysisModel.find({ resume: req.params.resumeId, user: req.user!.id })
            .sort({ createdAt: -1 }).lean();
        res.success({ history });
    } catch (err) { next(err); }
});

// POST /api/v1/analysis/:resumeId/interview-questions
router.post('/:resumeId/interview-questions', rateLimiter.analysis, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.params.resumeId || req.params.resumeId === 'select') {
            throw new AppError('Please select a resume first', 400, 'INVALID_RESUME');
        }

        const { jobTitle, jobDescription, forceRegenerate } = z.object({
            jobTitle: z.string().min(1).max(200),
            jobDescription: z.string().max(10000).optional(),
            forceRegenerate: z.boolean().optional(),
        }).parse(req.body);

        const cacheKey = `interview:${req.params.resumeId}:${jobTitle}`;
        
        if (!forceRegenerate) {
            const cached = await cache.get(cacheKey);
            if (cached) {
                return res.success({ questions: cached });
            }
        }

        const analysis = await AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user!.id, isLatest: true });
        if (!analysis?.nlpResult) throw new AppError('Analyze your resume first', 400, 'NO_ANALYSIS');

        const questions = await generateInterviewQuestions(analysis.nlpResult, jobTitle, jobDescription);
        await cache.set(cacheKey, questions, 3600); // Cache for 1 hour

        res.success({ questions });
    } catch (err) { next(err); }
});

// POST /api/v1/analysis/:resumeId/cover-letter
router.post('/:resumeId/cover-letter', rateLimiter.analysis, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.params.resumeId || req.params.resumeId === 'select') {
            throw new AppError('Please select a resume first', 400, 'INVALID_RESUME');
        }

        const { jobTitle, company, jobDescription } = z.object({
            jobTitle: z.string().min(1).max(200),
            company: z.string().min(1).max(200),
            jobDescription: z.string().max(10000).optional(),
        }).parse(req.body);

        const analysis = await AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user!.id, isLatest: true })
            .populate('resume', 'cleanedText');
        if (!analysis?.nlpResult) throw new AppError('Analyze your resume first', 400, 'NO_ANALYSIS');

        const resumeText = (analysis.resume as { cleanedText?: string })?.cleanedText ?? '';
        const result = await generateCoverLetter(resumeText, analysis.nlpResult, jobTitle, company, jobDescription);
        res.success({ coverLetter: result.coverLetter, wordCount: result.wordCount });
    } catch (err) { next(err); }
});

// POST /api/v1/analysis/custom-cover-letter
router.post('/custom-cover-letter', rateLimiter.analysis, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const payload = z.object({
            fullName: z.string().min(1).max(200),
            email: z.string().email(),
            phone: z.string().min(1).max(50),
            jobTitle: z.string().min(1).max(200),
            company: z.string().min(1).max(200),
            skills: z.string().min(1).max(2000),
            experience: z.string().max(10000).optional().default(''),
            projectTitle: z.string().max(200).optional().default(''),
            projectDesc: z.string().max(10000).optional().default(''),
            education: z.string().min(1).max(2000),
            whyInterested: z.string().min(1).max(5000),
        }).parse(req.body);

        const result = await generateCustomCoverLetter(payload);
        res.success({ coverLetter: result.coverLetter, wordCount: result.wordCount });
    } catch (err) { next(err); }
});

// POST /api/v1/analysis/:resumeId/roadmap
router.post('/:resumeId/roadmap', rateLimiter.analysis, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { targetRole } = z.object({ targetRole: z.string().min(1).max(200) }).parse(req.body);
        const analysis = await AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user!.id, isLatest: true });
        if (!analysis?.nlpResult) throw new AppError('Analyze your resume first', 400, 'NO_ANALYSIS');
        const roadmap = await generateCareerRoadmap(analysis.nlpResult, targetRole);
        res.success({ roadmap });
    } catch (err) { next(err); }
});

export default router;
