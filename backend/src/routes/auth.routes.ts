import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { rateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { Response, NextFunction } from 'express';

const router = Router();

const registerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', rateLimiter.auth, async (req, res: Response, next: NextFunction) => {
    try {
        const body = registerSchema.parse(req.body);
        const result = await authService.register(body);
        res.success({ user: result.user, tokens: result.tokens }, 'Registration successful', 201);
    } catch (err) { next(err); }
});

// POST /api/v1/auth/login
router.post('/login', rateLimiter.auth, async (req, res: Response, next: NextFunction) => {
    try {
        const body = loginSchema.parse(req.body);
        const result = await authService.login(body);
        res.success({ user: result.user, tokens: result.tokens }, 'Login successful');
    } catch (err) { next(err); }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
        const tokens = await authService.refreshToken(refreshToken);
        res.success({ tokens }, 'Token refreshed');
    } catch (err) { next(err); }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await authService.getProfile(req.user!.id);
        res.success({ user });
    } catch (err) { next(err); }
});

// PATCH /api/v1/auth/profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            name: z.string().min(2).max(100).optional(),
            avatar: z.string().url().optional(),
            language: z.string().optional(),
            theme: z.enum(['light', 'dark']).optional(),
            linkedInUrl: z.string().url().optional(),
        });
        const updates = schema.parse(req.body);
        const user = await authService.updateProfile(req.user!.id, updates);
        res.success({ user }, 'Profile updated');
    } catch (err) { next(err); }
});

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = z.object({
            currentPassword: z.string(),
            newPassword: z.string().min(8),
        }).parse(req.body);
        await authService.changePassword(req.user!.id, currentPassword, newPassword);
        res.success(null, 'Password changed successfully');
    } catch (err) { next(err); }
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', rateLimiter.forgotPassword, async (req: Response | any, res: Response, next: NextFunction) => {
    try {
        const { email } = z.object({ email: z.string().email() }).parse(req.body);
        await authService.forgotPassword(email);
        res.success(null, 'If that email is registered, a password reset link has been sent.');
    } catch (err) { next(err); }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', rateLimiter.auth, async (req: Response | any, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = z.object({
            token: z.string(),
            newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
        }).parse(req.body);
        await authService.resetPassword(token, newPassword);
        res.success(null, 'Password has been reset successfully');
    } catch (err) { next(err); }
});

export default router;
