import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';
import { UserModel } from '../models/User.model';
import { ResumeModel } from '../models/Resume.model';
import { AnalysisModel } from '../models/Analysis.model';
import { JobModel } from '../models/Job.model';
import { z } from 'zod';

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));

// GET /api/v1/admin/stats
router.get('/stats', async (_req, res: Response, next: NextFunction) => {
    try {
        const [totalUsers, totalResumes, totalAnalyses, totalJobs] = await Promise.all([
            UserModel.countDocuments(),
            ResumeModel.countDocuments(),
            AnalysisModel.countDocuments(),
            JobModel.countDocuments({ isActive: true }),
        ]);

        const recentUsers = await UserModel.find().sort({ createdAt: -1 }).limit(10)
            .select('name email role subscriptionTier createdAt lastLoginAt').lean();

        const subStats = await UserModel.aggregate([
            { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } },
        ]);

        res.success({ stats: { totalUsers, totalResumes, totalAnalyses, totalJobs, subStats, recentUsers } });
    } catch (err) { next(err); }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = z.object({
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            search: z.string().optional(),
        }).parse(req.query);
        const p = page ?? 1;
        const l = limit ?? 20;
        const filter = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
        const [users, total] = await Promise.all([
            UserModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
            UserModel.countDocuments(filter),
        ]);
        res.paginated(users, total, p, l);
    } catch (err) { next(err); }
});

// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', async (req, res: Response, next: NextFunction) => {
    try {
        const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
        await UserModel.findByIdAndUpdate(req.params.id, { isActive });
        res.success(null, `User ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) { next(err); }
});

// POST /api/v1/admin/jobs
router.post('/jobs', async (req, res: Response, next: NextFunction) => {
    try {
        const job = await JobModel.create(req.body);
        res.success({ job }, 'Job created', 201);
    } catch (err) { next(err); }
});

// DELETE /api/v1/admin/jobs/:id
router.delete('/jobs/:id', async (req, res: Response, next: NextFunction) => {
    try {
        await JobModel.findByIdAndUpdate(req.params.id, { isActive: false });
        res.success(null, 'Job deactivated');
    } catch (err) { next(err); }
});

export default router;
