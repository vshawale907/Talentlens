import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { resumeService, upload } from '../services/resume.service';

const router = Router();

// All resume routes require auth
router.use(authenticate);

// POST /api/v1/resumes/upload
router.post('/upload', rateLimiter.upload, upload.single('resume'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) throw new Error('No file provided');
        const { title } = z.object({ title: z.string().optional() }).parse(req.body);
        const resume = await resumeService.upload(req.user!.id, req.file, title);
        res.success({ resume }, 'Resume uploaded successfully', 201);
    } catch (err) { next(err); }
});

// POST /api/v1/resumes/:id/analyze (re-enqueue analysis with optional JD)
router.post('/:id/analyze', rateLimiter.analysis, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { jobDescriptionText } = z.object({
            jobDescriptionText: z.string().max(8000).optional(),
        }).parse(req.body);
        const { enqueueResumeAnalysis } = await import('../jobs/resumeQueue');
        const jobId = await enqueueResumeAnalysis({
            resumeId: req.params.id,
            userId: req.user!.id,
            jobDescriptionText,
        });
        res.success({ queued: true, jobId }, 'Analysis queued. Poll /status for results.', 202);
    } catch (err) { next(err); }
});

// GET /api/v1/resumes/:id/status - poll for async analysis result
router.get('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { ResumeModel } = await import('../models/Resume.model');
        const { AnalysisModel } = await import('../models/Analysis.model');
        const resume = await ResumeModel.findOne({ _id: req.params.id, user: req.user!.id }).lean();
        if (!resume) {
            const { AppError } = await import('../middleware/errorHandler');
            throw new AppError('Resume not found', 404, 'NOT_FOUND');
        }
        const analysis = resume.status === 'analyzed'
            ? await AnalysisModel.findOne({ resume: req.params.id, isLatest: true }).lean()
            : null;
        res.success({ status: resume.status, analysis });
    } catch (err) { next(err); }
});

// GET /api/v1/resumes
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = z.object({
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
        }).parse(req.query);
        const { resumes, total } = await resumeService.getByUser(req.user!.id, page, limit);
        res.paginated(resumes, total, page ?? 1, limit ?? 10);
    } catch (err) { next(err); }
});

// DELETE /api/v1/resumes/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await resumeService.delete(req.params.id, req.user!.id);
        res.success(null, 'Resume deleted');
    } catch (err) { next(err); }
});

export default router;
