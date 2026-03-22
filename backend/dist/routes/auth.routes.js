"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const rateLimiter_1 = require("../middleware/rateLimiter");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// POST /api/v1/auth/register
router.post('/register', rateLimiter_1.rateLimiter.auth, async (req, res, next) => {
    try {
        const body = registerSchema.parse(req.body);
        const result = await auth_service_1.authService.register(body);
        res.success({ user: result.user, tokens: result.tokens }, 'Registration successful', 201);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/login
router.post('/login', rateLimiter_1.rateLimiter.auth, async (req, res, next) => {
    try {
        const body = loginSchema.parse(req.body);
        const result = await auth_service_1.authService.login(body);
        res.success({ user: result.user, tokens: result.tokens }, 'Login successful');
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = zod_1.z.object({ refreshToken: zod_1.z.string() }).parse(req.body);
        const tokens = await auth_service_1.authService.refreshToken(refreshToken);
        res.success({ tokens }, 'Token refreshed');
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/auth/me
router.get('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const user = await auth_service_1.authService.getProfile(req.user.id);
        res.success({ user });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/v1/auth/profile
router.patch('/profile', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            name: zod_1.z.string().min(2).max(100).optional(),
            avatar: zod_1.z.string().url().optional(),
            language: zod_1.z.string().optional(),
            theme: zod_1.z.enum(['light', 'dark']).optional(),
            linkedInUrl: zod_1.z.string().url().optional(),
        });
        const updates = schema.parse(req.body);
        const user = await auth_service_1.authService.updateProfile(req.user.id, updates);
        res.success({ user }, 'Profile updated');
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/change-password
router.post('/change-password', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = zod_1.z.object({
            currentPassword: zod_1.z.string(),
            newPassword: zod_1.z.string().min(8),
        }).parse(req.body);
        await auth_service_1.authService.changePassword(req.user.id, currentPassword, newPassword);
        res.success(null, 'Password changed successfully');
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/forgot-password
router.post('/forgot-password', rateLimiter_1.rateLimiter.forgotPassword, async (req, res, next) => {
    try {
        const { email } = zod_1.z.object({ email: zod_1.z.string().email() }).parse(req.body);
        await auth_service_1.authService.forgotPassword(email);
        res.success(null, 'If that email is registered, a password reset link has been sent.');
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/reset-password
router.post('/reset-password', rateLimiter_1.rateLimiter.auth, async (req, res, next) => {
    try {
        const { token, newPassword } = zod_1.z.object({
            token: zod_1.z.string(),
            newPassword: zod_1.z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
        }).parse(req.body);
        await auth_service_1.authService.resetPassword(token, newPassword);
        res.success(null, 'Password has been reset successfully');
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map