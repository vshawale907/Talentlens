import mongoose, { Document, Model } from 'mongoose';
export declare enum UserRole {
    USER = "user",
    RECRUITER = "recruiter",
    ADMIN = "admin"
}
export declare enum SubscriptionTier {
    FREE = "free",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    subscriptionTier: SubscriptionTier;
    isActive: boolean;
    isEmailVerified: boolean;
    avatar?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
    language: string;
    theme: 'light' | 'dark';
    resumeCount: number;
    analysisCount: number;
    linkedInUrl?: string;
    lastLoginAt?: Date;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const UserModel: Model<IUser>;
//# sourceMappingURL=User.model.d.ts.map