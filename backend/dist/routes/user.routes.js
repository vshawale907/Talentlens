"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_model_1 = require("../models/User.model");
const Resume_model_1 = require("../models/Resume.model");
const Analysis_model_1 = require("../models/Analysis.model");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
const mongoose_1 = __importDefault(require("mongoose"));
// GET /api/v1/users/analytics - Dashboard data
router.get('/analytics', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userObjId = new mongoose_1.default.Types.ObjectId(userId);
        const [user, resumeCount, analysisCount, recentAnalyses] = await Promise.all([
            User_model_1.UserModel.findById(userId).select('resumeCount analysisCount subscriptionTier createdAt').lean(),
            Resume_model_1.ResumeModel.countDocuments({ user: userId }),
            Analysis_model_1.AnalysisModel.countDocuments({ user: userId }),
            Analysis_model_1.AnalysisModel.find({ user: userId, isLatest: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('resume', 'title createdAt')
                .select('nlpResult.similarityScore openAIResult.atsScore openAIResult.overallScore createdAt')
                .lean(),
        ]);
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        // Monthly upload trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyUploads = await Resume_model_1.ResumeModel.aggregate([
            { $match: { user: userObjId, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);
        const scoreHistory = await Analysis_model_1.AnalysisModel.aggregate([
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map