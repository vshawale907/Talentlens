import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { ChatSessionModel } from '../models/ChatSession.model';
import { AnalysisModel } from '../models/Analysis.model';
import { ResumeModel } from '../models/Resume.model';
import { chatWithCoach, chatWithCoachStructured, CoachingMode } from '../services/openai.service';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const COACHING_MODES: CoachingMode[] = ['general', 'resume_review', 'skill_gap', 'interview_prep', 'career_guidance', 'bullet_rewrite', 'interview_sim'];

// POST /api/v1/chat/sessions - create new session
router.post('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { resumeId, title } = z.object({
            resumeId: z.string().optional(),
            title: z.string().optional(),
        }).parse(req.body);
        const session = await ChatSessionModel.create({
            user: req.user!.id,
            resume: resumeId,
            title: title || 'Resume Coach Session',
            messages: [],
        });
        res.success({ session }, 'Chat session created', 201);
    } catch (err) { next(err); }
});

// GET /api/v1/chat/sessions - list user's sessions
router.get('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const sessions = await ChatSessionModel.find({ user: req.user!.id })
            .sort({ updatedAt: -1 }).limit(20).select('-messages').lean();
        res.success({ sessions });
    } catch (err) { next(err); }
});

// POST /api/v1/chat/sessions/:id/message - send a message (supports structured coaching modes)
router.post('/sessions/:id/message', rateLimiter.chat, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { message, mode, bulletText } = z.object({
            message: z.string().min(1).max(4000),
            mode: z.enum(['general', 'resume_review', 'skill_gap', 'interview_prep', 'career_guidance', 'bullet_rewrite', 'interview_sim']).optional().default('general'),
            bulletText: z.string().max(500).optional(),
        }).parse(req.body);

        const session = await ChatSessionModel.findOne({ _id: req.params.id, user: req.user!.id });
        if (!session) throw new NotFoundError('Chat session');

        // Fetch resume context + latest NLP analysis
        let resumeText: string | undefined;
        let nlpData;
        if (session.resume) {
            const [resume, analysis] = await Promise.all([
                ResumeModel.findById(session.resume).select('cleanedText').lean(),
                AnalysisModel.findOne({ resume: session.resume, isLatest: true }).lean(),
            ]);
            resumeText = resume?.cleanedText;
            nlpData = analysis?.nlpResult;
        }

        // Add user message to history
        session.messages.push({ role: 'user', content: message, timestamp: new Date() });

        // Last 10 messages for context window
        const historyForAI = session.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

        let aiReply: string;
        let structured = null;

        if (mode && COACHING_MODES.includes(mode) && mode !== 'general') {
            // Structured coaching mode — returns rich JSON response
            const result = await chatWithCoachStructured(historyForAI, mode, resumeText, nlpData, bulletText);
            structured = result;
            aiReply = result.feedback; // Store plain text in history for session continuity
        } else {
            // General free-form chat — plain text
            aiReply = await chatWithCoach(historyForAI, resumeText, nlpData);
        }

        // Add AI reply to session messages
        session.messages.push({ role: 'assistant', content: aiReply, timestamp: new Date() });

        // Auto-title the session from first user message
        if (session.messages.length === 2) {
            session.title = message.slice(0, 60) + (message.length > 60 ? '…' : '');
        }
        await session.save();

        res.success({ reply: aiReply, structured, sessionId: session._id });
    } catch (err) { next(err); }
});

// DELETE /api/v1/chat/sessions/:id
router.delete('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await ChatSessionModel.deleteOne({ _id: req.params.id, user: req.user!.id });
        res.success(null, 'Session deleted');
    } catch (err) { next(err); }
});

export default router;

