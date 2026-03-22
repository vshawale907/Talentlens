import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { ResumeModel } from '../models/Resume.model';
import { AnalysisModel } from '../models/Analysis.model';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

import mongoose from 'mongoose';

// GET /api/v1/users/analytics - Dashboard data
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userObjId = new mongoose.Types.ObjectId(userId);

        const [user, resumeCount, analysisCount, recentAnalyses] = await Promise.all([
            UserModel.findById(userId).select('resumeCount analysisCount subscriptionTier createdAt').lean(),
            ResumeModel.countDocuments({ user: userId }),
            AnalysisModel.countDocuments({ user: userId }),
            AnalysisModel.find({ user: userId, isLatest: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('resume', 'title createdAt')
                .select('nlpResult.similarityScore nlpResult.extractedSkills openAIResult.atsScore openAIResult.overallScore createdAt')
                .lean(),
        ]);

        if (!user) throw new NotFoundError('User');

        // Monthly upload trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyUploads = await ResumeModel.aggregate([
            { $match: { user: userObjId, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const scoreHistory = await AnalysisModel.aggregate([
            { $match: { user: userObjId, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, avgATS: { $avg: '$openAIResult.atsScore' }, avgOverall: { $avg: '$openAIResult.overallScore' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        res.success({
            analytics: {
                resumeCount,
                analysisCount,
                subscriptionTier: user.subscriptionTier,
                memberSince: user.createdAt,
                recentAnalyses,
                monthlyUploads,
                scoreHistory,
            },
        });
    } catch (err) { next(err); }
});

export default router;
