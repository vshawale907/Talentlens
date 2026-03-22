import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        subscriptionTier: string;
    };
}
export declare const authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: UserRole[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const requireSubscription: (...tiers: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map