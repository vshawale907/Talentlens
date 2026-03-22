import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { UserModel, IUser, UserRole, SubscriptionTier } from '../models/User.model';
import { AppError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { emailService } from './email.service';

interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
}

interface LoginInput {
    email: string;
    password: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthResponse {
    user: Omit<IUser, 'password'>;
    tokens: TokenPair;
}

const generateTokens = (user: IUser): TokenPair => {
    const payload = { id: user._id.toString(), email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, config.JWT_SECRET as jwt.Secret, {
        expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
        { id: user._id.toString() },
        config.JWT_REFRESH_SECRET as jwt.Secret,
        { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
};

export const authService = {
    register: async (input: RegisterInput): Promise<AuthResponse> => {
        const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
        if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

        const user = await UserModel.create({
            name: input.name.trim(),
            email: input.email.toLowerCase().trim(),
            password: input.password,
            role: input.role || UserRole.USER,
            subscriptionTier: SubscriptionTier.FREE,
        });

        logger.info(`New user registered: ${user.email} [${user.role}]`);
        const tokens = generateTokens(user);
        return { user: user.toJSON() as unknown as Omit<IUser, 'password'>, tokens };
    },

    login: async (input: LoginInput): Promise<AuthResponse> => {
        const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select('+password');
        if (!user) throw new UnauthorizedError('Invalid email or password');
        if (!user.isActive) throw new UnauthorizedError('Account is deactivated. Contact support.');

        const isMatch = await user.comparePassword(input.password);
        if (!isMatch) throw new UnauthorizedError('Invalid email or password');

        // Update last login
        await UserModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        logger.info(`User logged in: ${user.email}`);
        const tokens = generateTokens(user);
        return { user: user.toJSON() as unknown as Omit<IUser, 'password'>, tokens };
    },

    refreshToken: async (refreshToken: string): Promise<TokenPair> => {
        let decoded: { id: string };
        try {
            decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { id: string };
        } catch {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        const user = await UserModel.findById(decoded.id);
        if (!user || !user.isActive) throw new UnauthorizedError('User not found or deactivated');

        return generateTokens(user);
    },

    changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
        const user = await UserModel.findById(userId).select('+password');
        if (!user) throw new NotFoundError('User');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');

        user.password = newPassword;
        await user.save();
        logger.info(`Password changed for user: ${user.email}`);
    },

    forgotPassword: async (email: string): Promise<void> => {
        const user = await UserModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Silently do nothing to prevent email enumeration attacks
            logger.info(`Forgot password requested for unknown email: ${email}`);
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();

        logger.info(`Forgot password requested for: ${user.email}`);

        // Send the actual reset email
        await emailService.sendPasswordResetEmail(user.email, resetToken);
    },

    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await UserModel.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpire: { $gt: new Date() }
        }).select('+password');

        if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save(); // password hook will re-hash it

        logger.info(`Password successfully reset for user: ${user.email}`);
    },

    getProfile: async (userId: string): Promise<IUser> => {
        const user = await UserModel.findById(userId).lean();
        if (!user) throw new NotFoundError('User');
        return user as unknown as IUser;
    },

    updateProfile: async (userId: string, updates: Partial<Pick<IUser, 'name' | 'avatar' | 'language' | 'theme' | 'linkedInUrl'>>): Promise<IUser> => {
        const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
        if (!user) throw new NotFoundError('User');
        return user as unknown as IUser;
    },
};
