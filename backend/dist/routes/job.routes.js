"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const job_service_1 = require("../services/job.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// GET /api/v1/jobs - search/list jobs
router.get('/', async (req, res, next) => {
    try {
        const { q, page, limit } = zod_1.z.object({
            q: zod_1.z.string().optional(),
            page: zod_1.z.string().transform(Number).optional(),
            limit: zod_1.z.string().transform(Number).optional(),
        }).parse(req.query);
        const { jobs, total } = await job_service_1.jobService.search(q ?? '', page, limit);
        res.paginated(jobs, total, page ?? 1, limit ?? 10);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/jobs/match/:resumeId - keyword-based matching
router.get('/match/:resumeId', async (req, res, next) => {
    try {
        const matches = await job_service_1.jobService.findMatches(req.user.id, req.params.resumeId);
        res.success({ matches });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/jobs/semantic/:resumeId - semantic vector matching via Qdrant
router.get('/semantic/:resumeId', async (req, res, next) => {
    try {
        const { topN } = zod_1.z.object({
            topN: zod_1.z.string().transform(Number).optional(),
        }).parse(req.query);
        const matches = await job_service_1.jobService.findSemanticMatches(req.user.id, req.params.resumeId, topN ?? 20);
        // If Qdrant returned results, use them; otherwise fall back to keyword matching
        if (matches.length > 0) {
            res.success({ matches, engine: 'vector' });
        }
        else {
            const fallback = await job_service_1.jobService.findMatches(req.user.id, req.params.resumeId);
            res.success({ matches: fallback, engine: 'keyword-fallback' });
        }
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/jobs/:id  (must be AFTER named routes to avoid :id swallowing them)
router.get('/:id', async (_req, res, next) => {
    try {
        const job = await job_service_1.jobService.getById(_req.params.id);
        res.success({ job });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=job.routes.js.map