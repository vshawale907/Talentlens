import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { UserModel, UserRole } from '../models/User.model';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        subscriptionTier: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
        id: string;
        email: string;
        role: UserRole;
    };

    const user = await UserModel.findById(decoded.id).select('-password').lean();
    if (!user) throw new UnauthorizedError('User no longer exists');
    if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

    req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
    };

    next();
};

export const authorize = (...roles: UserRole[]) =>
    (req: AuthRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) throw new UnauthorizedError();
        if (!roles.includes(req.user.role)) {
            throw new ForbiddenError('Insufficient permissions for this resource');
        }
        next();
    };

export const requireSubscription = (...tiers: string[]) =>
    (req: AuthRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) throw new UnauthorizedError();
        if (!tiers.includes(req.user.subscriptionTier)) {
            throw new ForbiddenError('This feature requires a higher subscription tier');
        }
        next();
    };
