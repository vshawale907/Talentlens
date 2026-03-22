"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const ChatSession_model_1 = require("../models/ChatSession.model");
const Analysis_model_1 = require("../models/Analysis.model");
const Resume_model_1 = require("../models/Resume.model");
const openai_service_1 = require("../services/openai.service");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
const COACHING_MODES = ['general', 'resume_review', 'skill_gap', 'interview_prep', 'career_guidance', 'bullet_rewrite', 'interview_sim'];
// POST /api/v1/chat/sessions - create new session
router.post('/sessions', async (req, res, next) => {
    try {
        const { resumeId, title } = zod_1.z.object({
            resumeId: zod_1.z.string().optional(),
            title: zod_1.z.string().optional(),
        }).parse(req.body);
        const session = await ChatSession_model_1.ChatSessionModel.create({
            user: req.user.id,
            resume: resumeId,
            title: title || 'Resume Coach Session',
            messages: [],
        });
        res.success({ session }, 'Chat session created', 201);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/chat/sessions - list user's sessions
router.get('/sessions', async (req, res, next) => {
    try {
        const sessions = await ChatSession_model_1.ChatSessionModel.find({ user: req.user.id })
            .sort({ updatedAt: -1 }).limit(20).select('-messages').lean();
        res.success({ sessions });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/chat/sessions/:id/message - send a message (supports structured coaching modes)
router.post('/sessions/:id/message', rateLimiter_1.rateLimiter.chat, async (req, res, next) => {
    try {
        const { message, mode, bulletText } = zod_1.z.object({
            message: zod_1.z.string().min(1).max(4000),
            mode: zod_1.z.enum(['general', 'resume_review', 'skill_gap', 'interview_prep', 'career_guidance', 'bullet_rewrite', 'interview_sim']).optional().default('general'),
            bulletText: zod_1.z.string().max(500).optional(),
        }).parse(req.body);
        const session = await ChatSession_model_1.ChatSessionModel.findOne({ _id: req.params.id, user: req.user.id });
        if (!session)
            throw new errorHandler_1.NotFoundError('Chat session');
        // Fetch resume context + latest NLP analysis
        let resumeText;
        let nlpData;
        if (session.resume) {
            const [resume, analysis] = await Promise.all([
                Resume_model_1.ResumeModel.findById(session.resume).select('cleanedText').lean(),
                Analysis_model_1.AnalysisModel.findOne({ resume: session.resume, isLatest: true }).lean(),
            ]);
            resumeText = resume?.cleanedText;
            nlpData = analysis?.nlpResult;
        }
        // Add user message to history
        session.messages.push({ role: 'user', content: message, timestamp: new Date() });
        // Last 10 messages for context window
        const historyForAI = session.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
        let aiReply;
        let structured = null;
        if (mode && COACHING_MODES.includes(mode) && mode !== 'general') {
            // Structured coaching mode — returns rich JSON response
            const result = await (0, openai_service_1.chatWithCoachStructured)(historyForAI, mode, resumeText, nlpData, bulletText);
            structured = result;
            aiReply = result.feedback; // Store plain text in history for session continuity
        }
        else {
            // General free-form chat — plain text
            aiReply = await (0, openai_service_1.chatWithCoach)(historyForAI, resumeText, nlpData);
        }
        // Add AI reply to session messages
        session.messages.push({ role: 'assistant', content: aiReply, timestamp: new Date() });
        // Auto-title the session from first user message
        if (session.messages.length === 2) {
            session.title = message.slice(0, 60) + (message.length > 60 ? '…' : '');
        }
        await session.save();
        res.success({ reply: aiReply, structured, sessionId: session._id });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/chat/sessions/:id
router.delete('/sessions/:id', async (req, res, next) => {
    try {
        await ChatSession_model_1.ChatSessionModel.deleteOne({ _id: req.params.id, user: req.user.id });
        res.success(null, 'Session deleted');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map