"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const Analysis_model_1 = require("../models/Analysis.model");
const openai_service_1 = require("../services/openai.service");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// GET /api/v1/analysis/:resumeId/latest
router.get('/:resumeId/latest', async (req, res, next) => {
    try {
        const analysis = await Analysis_model_1.AnalysisModel.findOne({
            resume: req.params.resumeId,
            user: req.user.id,
            isLatest: true,
        }).lean();
        if (!analysis)
            throw new errorHandler_1.NotFoundError('Analysis');
        res.success({ analysis });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/analysis/:resumeId/history
router.get('/:resumeId/history', async (req, res, next) => {
    try {
        const history = await Analysis_model_1.AnalysisModel.find({ resume: req.params.resumeId, user: req.user.id })
            .sort({ createdAt: -1 }).lean();
        res.success({ history });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/analysis/:resumeId/interview-questions
router.post('/:resumeId/interview-questions', rateLimiter_1.rateLimiter.analysis, async (req, res, next) => {
    try {
        if (!req.params.resumeId || req.params.resumeId === 'select') {
            throw new errorHandler_1.AppError('Please select a resume first', 400, 'INVALID_RESUME');
        }
        const { jobTitle, jobDescription } = zod_1.z.object({
            jobTitle: zod_1.z.string().min(1).max(200),
            jobDescription: zod_1.z.string().max(10000).optional(),
        }).parse(req.body);
        const analysis = await Analysis_model_1.AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user.id, isLatest: true });
        if (!analysis?.nlpResult)
            throw new errorHandler_1.AppError('Analyze your resume first', 400, 'NO_ANALYSIS');
        const questions = await (0, openai_service_1.generateInterviewQuestions)(analysis.nlpResult, jobTitle, jobDescription);
        res.success({ questions });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/analysis/:resumeId/cover-letter
router.post('/:resumeId/cover-letter', rateLimiter_1.rateLimiter.analysis, async (req, res, next) => {
    try {
        if (!req.params.resumeId || req.params.resumeId === 'select') {
            throw new errorHandler_1.AppError('Please select a resume first', 400, 'INVALID_RESUME');
        }
        const { jobTitle, company, jobDescription } = zod_1.z.object({
            jobTitle: zod_1.z.string().min(1).max(200),
            company: zod_1.z.string().min(1).max(200),
            jobDescription: zod_1.z.string().max(10000).optional(),
        }).parse(req.body);
        const analysis = await Analysis_model_1.AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user.id, isLatest: true })
            .populate('resume', 'cleanedText');
        if (!analysis?.nlpResult)
            throw new errorHandler_1.AppError('Analyze your resume first', 400, 'NO_ANALYSIS');
        const resumeText = analysis.resume?.cleanedText ?? '';
        const result = await (0, openai_service_1.generateCoverLetter)(resumeText, analysis.nlpResult, jobTitle, company, jobDescription);
        res.success({ coverLetter: result.coverLetter, wordCount: result.wordCount });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/analysis/custom-cover-letter
router.post('/custom-cover-letter', rateLimiter_1.rateLimiter.analysis, async (req, res, next) => {
    try {
        const payload = zod_1.z.object({
            fullName: zod_1.z.string().min(1).max(200),
            email: zod_1.z.string().email(),
            phone: zod_1.z.string().min(1).max(50),
            jobTitle: zod_1.z.string().min(1).max(200),
            company: zod_1.z.string().min(1).max(200),
            skills: zod_1.z.string().min(1).max(2000),
            experience: zod_1.z.string().max(10000).optional().default(''),
            projectTitle: zod_1.z.string().max(200).optional().default(''),
            projectDesc: zod_1.z.string().max(10000).optional().default(''),
            education: zod_1.z.string().min(1).max(2000),
            whyInterested: zod_1.z.string().min(1).max(5000),
        }).parse(req.body);
        const result = await (0, openai_service_1.generateCustomCoverLetter)(payload);
        res.success({ coverLetter: result.coverLetter, wordCount: result.wordCount });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/analysis/:resumeId/roadmap
router.post('/:resumeId/roadmap', rateLimiter_1.rateLimiter.analysis, async (req, res, next) => {
    try {
        const { targetRole } = zod_1.z.object({ targetRole: zod_1.z.string().min(1).max(200) }).parse(req.body);
        const analysis = await Analysis_model_1.AnalysisModel.findOne({ resume: req.params.resumeId, user: req.user.id, isLatest: true });
        if (!analysis?.nlpResult)
            throw new errorHandler_1.AppError('Analyze your resume first', 400, 'NO_ANALYSIS');
        const roadmap = await (0, openai_service_1.generateCareerRoadmap)(analysis.nlpResult, targetRole);
        res.success({ roadmap });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=analysis.routes.js.map