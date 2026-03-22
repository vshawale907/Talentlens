"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const User_model_1 = require("../models/User.model");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const stripe_1 = __importDefault(require("stripe"));
const router = (0, express_1.Router)();
let stripe = null;
if (env_1.config.STRIPE_SECRET_KEY) {
    stripe = new stripe_1.default(env_1.config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}
const requireStripe = (_req, _res, next) => {
    if (!stripe)
        throw new errorHandler_1.AppError('Payment system not configured', 503, 'STRIPE_NOT_CONFIGURED');
    next();
};
// POST /api/v1/subscriptions/create-checkout
router.post('/create-checkout', auth_middleware_1.authenticate, requireStripe, async (req, res, next) => {
    try {
        const { tier } = req.body;
        const priceId = tier === 'pro' ? env_1.config.STRIPE_PRICE_PRO : env_1.config.STRIPE_PRICE_ENTERPRISE;
        if (!priceId)
            throw new errorHandler_1.AppError('Invalid subscription tier', 400);
        let customerId = (await User_model_1.UserModel.findById(req.user.id).select('stripeCustomerId').lean())?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({ email: req.user.email, metadata: { userId: req.user.id } });
            customerId = customer.id;
            await User_model_1.UserModel.findByIdAndUpdate(req.user.id, { stripeCustomerId: customerId });
        }
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${env_1.config.FRONTEND_URL}/dashboard?subscription=success`,
            cancel_url: `${env_1.config.FRONTEND_URL}/pricing?subscription=cancelled`,
            metadata: { userId: req.user.id, tier },
        });
        res.success({ checkoutUrl: session.url });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/subscriptions/webhook (Stripe webhook - no auth)
router.post('/webhook', async (req, res, next) => {
    try {
        if (!stripe || !env_1.config.STRIPE_WEBHOOK_SECRET)
            throw new errorHandler_1.AppError('Stripe not configured', 503);
        const sig = req.headers['stripe-signature'];
        const event = stripe.webhooks.constructEvent(req.body, sig, env_1.config.STRIPE_WEBHOOK_SECRET);
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { userId, tier } = session.metadata;
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            await User_model_1.UserModel.findByIdAndUpdate(userId, {
                subscriptionTier: tier,
                stripeSubscriptionId: subscription.id,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
            logger_1.logger.info(`Subscription activated: userId=${userId}, tier=${tier}`);
        }
        if (event.type === 'customer.subscription.deleted') {
            const sub = event.data.object;
            await User_model_1.UserModel.findOneAndUpdate({ stripeSubscriptionId: sub.id }, { subscriptionTier: 'free', stripeSubscriptionId: null });
            logger_1.logger.info(`Subscription cancelled: ${sub.id}`);
        }
        res.json({ received: true });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/subscriptions/portal
router.get('/portal', auth_middleware_1.authenticate, requireStripe, async (req, res, next) => {
    try {
        const user = await User_model_1.UserModel.findById(req.user.id).select('stripeCustomerId').lean();
        if (!user?.stripeCustomerId)
            throw new errorHandler_1.AppError('No billing account found', 404);
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${env_1.config.FRONTEND_URL}/dashboard`,
        });
        res.success({ portalUrl: session.url });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map