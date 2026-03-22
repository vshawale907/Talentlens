import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { jobService } from '../services/job.service';

const router = Router();
router.use(authenticate);

// GET /api/v1/jobs - search/list jobs
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { q, page, limit } = z.object({
            q: z.string().optional(),
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
        }).parse(req.query);
        const { jobs, total } = await jobService.search(q ?? '', page, limit);
        res.paginated(jobs, total, page ?? 1, limit ?? 10);
    } catch (err) { next(err); }
});

// GET /api/v1/jobs/match/:resumeId - keyword-based matching
router.get('/match/:resumeId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const matches = await jobService.findMatches(req.user!.id, req.params.resumeId);
        res.success({ matches });
    } catch (err) { next(err); }
});

// GET /api/v1/jobs/semantic/:resumeId - semantic vector matching via Qdrant
router.get('/semantic/:resumeId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topN } = z.object({
            topN: z.string().transform(Number).optional(),
        }).parse(req.query);
        const matches = await jobService.findSemanticMatches(req.user!.id, req.params.resumeId, topN ?? 20);
        // If Qdrant returned results, use them; otherwise fall back to keyword matching
        if (matches.length > 0) {
            res.success({ matches, engine: 'vector' });
        } else {
            const fallback = await jobService.findMatches(req.user!.id, req.params.resumeId);
            res.success({ matches: fallback, engine: 'keyword-fallback' });
        }
    } catch (err) { next(err); }
});

// GET /api/v1/jobs/:id  (must be AFTER named routes to avoid :id swallowing them)
router.get('/:id', async (_req, res: Response, next: NextFunction) => {
    try {
        const job = await jobService.getById(_req.params.id);
        res.success({ job });
    } catch (err) { next(err); }
});

export default router;
