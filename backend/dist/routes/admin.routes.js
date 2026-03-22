"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_model_1 = require("../models/User.model");
const User_model_2 = require("../models/User.model");
const Resume_model_1 = require("../models/Resume.model");
const Analysis_model_1 = require("../models/Analysis.model");
const Job_model_1 = require("../models/Job.model");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(User_model_1.UserRole.ADMIN));
// GET /api/v1/admin/stats
router.get('/stats', async (_req, res, next) => {
    try {
        const [totalUsers, totalResumes, totalAnalyses, totalJobs] = await Promise.all([
            User_model_2.UserModel.countDocuments(),
            Resume_model_1.ResumeModel.countDocuments(),
            Analysis_model_1.AnalysisModel.countDocuments(),
            Job_model_1.JobModel.countDocuments({ isActive: true }),
        ]);
        const recentUsers = await User_model_2.UserModel.find().sort({ createdAt: -1 }).limit(10)
            .select('name email role subscriptionTier createdAt lastLoginAt').lean();
        const subStats = await User_model_2.UserModel.aggregate([
            { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } },
        ]);
        res.success({ stats: { totalUsers, totalResumes, totalAnalyses, totalJobs, subStats, recentUsers } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/admin/users
router.get('/users', async (req, res, next) => {
    try {
        const { page, limit, search } = zod_1.z.object({
            page: zod_1.z.string().transform(Number).optional(),
            limit: zod_1.z.string().transform(Number).optional(),
            search: zod_1.z.string().optional(),
        }).parse(req.query);
        const p = page ?? 1;
        const l = limit ?? 20;
        const filter = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
        const [users, total] = await Promise.all([
            User_model_2.UserModel.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
            User_model_2.UserModel.countDocuments(filter),
        ]);
        res.paginated(users, total, p, l);
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
    try {
        const { isActive } = zod_1.z.object({ isActive: zod_1.z.boolean() }).parse(req.body);
        await User_model_2.UserModel.findByIdAndUpdate(req.params.id, { isActive });
        res.success(null, `User ${isActive ? 'activated' : 'deactivated'}`);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/admin/jobs
router.post('/jobs', async (req, res, next) => {
    try {
        const job = await Job_model_1.JobModel.create(req.body);
        res.success({ job }, 'Job created', 201);
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/admin/jobs/:id
router.delete('/jobs/:id', async (req, res, next) => {
    try {
        await Job_model_1.JobModel.findByIdAndUpdate(req.params.id, { isActive: false });
        res.success(null, 'Job deactivated');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map