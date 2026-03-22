"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const resume_service_1 = require("../services/resume.service");
const router = (0, express_1.Router)();
// All resume routes require auth
router.use(auth_middleware_1.authenticate);
// POST /api/v1/resumes/upload
router.post('/upload', rateLimiter_1.rateLimiter.upload, resume_service_1.upload.single('resume'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new Error('No file provided');
        const { title } = zod_1.z.object({ title: zod_1.z.string().optional() }).parse(req.body);
        const resume = await resume_service_1.resumeService.upload(req.user.id, req.file, title);
        res.success({ resume }, 'Resume uploaded successfully', 201);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/resumes/:id/analyze (re-enqueue analysis with optional JD)
router.post('/:id/analyze', rateLimiter_1.rateLimiter.analysis, async (req, res, next) => {
    try {
        const { jobDescriptionText } = zod_1.z.object({
            jobDescriptionText: zod_1.z.string().max(8000).optional(),
        }).parse(req.body);
        const { enqueueResumeAnalysis } = await Promise.resolve().then(() => __importStar(require('../jobs/resumeQueue')));
        const jobId = await enqueueResumeAnalysis({
            resumeId: req.params.id,
            userId: req.user.id,
            jobDescriptionText,
        });
        res.success({ queued: true, jobId }, 'Analysis queued. Poll /status for results.', 202);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/resumes/:id/status - poll for async analysis result
router.get('/:id/status', async (req, res, next) => {
    try {
        const { ResumeModel } = await Promise.resolve().then(() => __importStar(require('../models/Resume.model')));
        const { AnalysisModel } = await Promise.resolve().then(() => __importStar(require('../models/Analysis.model')));
        const resume = await ResumeModel.findOne({ _id: req.params.id, user: req.user.id }).lean();
        if (!resume) {
            const { AppError } = await Promise.resolve().then(() => __importStar(require('../middleware/errorHandler')));
            throw new AppError('Resume not found', 404, 'NOT_FOUND');
        }
        const analysis = resume.status === 'analyzed'
            ? await AnalysisModel.findOne({ resume: req.params.id, isLatest: true }).lean()
            : null;
        res.success({ status: resume.status, analysis });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/resumes
router.get('/', async (req, res, next) => {
    try {
        const { page, limit } = zod_1.z.object({
            page: zod_1.z.string().transform(Number).optional(),
            limit: zod_1.z.string().transform(Number).optional(),
        }).parse(req.query);
        const { resumes, total } = await resume_service_1.resumeService.getByUser(req.user.id, page, limit);
        res.paginated(resumes, total, page ?? 1, limit ?? 10);
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/resumes/:id
router.delete('/:id', async (req, res, next) => {
    try {
        await resume_service_1.resumeService.delete(req.params.id, req.user.id);
        res.success(null, 'Resume deleted');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=resume.routes.js.map