import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { UserModel } from '../models/User.model';
import { config } from '../config/env';
import { logger } from '../config/logger';
import Stripe from 'stripe';

const router = Router();

let stripe: Stripe | null = null;
if (config.STRIPE_SECRET_KEY) {
    stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

const requireStripe = (_req: unknown, _res: unknown, next: NextFunction) => {
    if (!stripe) throw new AppError('Payment system not configured', 503, 'STRIPE_NOT_CONFIGURED');
    next();
};

// POST /api/v1/subscriptions/create-checkout
router.post('/create-checkout', authenticate, requireStripe, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { tier } = req.body as { tier: 'pro' | 'enterprise' };
        const priceId = tier === 'pro' ? config.STRIPE_PRICE_PRO : config.STRIPE_PRICE_ENTERPRISE;
        if (!priceId) throw new AppError('Invalid subscription tier', 400);

        let customerId = (await UserModel.findById(req.user!.id).select('stripeCustomerId').lean())?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe!.customers.create({ email: req.user!.email, metadata: { userId: req.user!.id } });
            customerId = customer.id;
            await UserModel.findByIdAndUpdate(req.user!.id, { stripeCustomerId: customerId });
        }

        const session = await stripe!.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${config.FRONTEND_URL}/dashboard?subscription=success`,
            cancel_url: `${config.FRONTEND_URL}/pricing?subscription=cancelled`,
            metadata: { userId: req.user!.id, tier },
        });

        res.success({ checkoutUrl: session.url });
    } catch (err) { next(err); }
});

// POST /api/v1/subscriptions/webhook (Stripe webhook - no auth)
router.post('/webhook', async (req, res: Response, next: NextFunction) => {
    try {
        if (!stripe || !config.STRIPE_WEBHOOK_SECRET) throw new AppError('Stripe not configured', 503);

        const sig = req.headers['stripe-signature'] as string;
        const event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const { userId, tier } = session.metadata as { userId: string; tier: string };
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

            await UserModel.findByIdAndUpdate(userId, {
                subscriptionTier: tier,
                stripeSubscriptionId: subscription.id,
                currentPeriodEnd: new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
            });

            logger.info(`Subscription activated: userId=${userId}, tier=${tier}`);
        }

        if (event.type === 'customer.subscription.deleted') {
            const sub = event.data.object as Stripe.Subscription;
            await UserModel.findOneAndUpdate(
                { stripeSubscriptionId: sub.id },
                { subscriptionTier: 'free', stripeSubscriptionId: null }
            );
            logger.info(`Subscription cancelled: ${sub.id}`);
        }

        res.json({ received: true });
    } catch (err) { next(err); }
});

// GET /api/v1/subscriptions/portal
router.get('/portal', authenticate, requireStripe, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await UserModel.findById(req.user!.id).select('stripeCustomerId').lean();
        if (!user?.stripeCustomerId) throw new AppError('No billing account found', 404);
        const session = await stripe!.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${config.FRONTEND_URL}/dashboard`,
        });
        res.success({ portalUrl: session.url });
    } catch (err) { next(err); }
});

export default router;
