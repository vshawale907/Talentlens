import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
    USER = 'user',
    RECRUITER = 'recruiter',
    ADMIN = 'admin',
}

export enum SubscriptionTier {
    FREE = 'free',
    PRO = 'pro',
    ENTERPRISE = 'enterprise',
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

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: {
            type: String, required: true, unique: true,
            lowercase: true, trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
        },
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
        subscriptionTier: { type: String, enum: Object.values(SubscriptionTier), default: SubscriptionTier.FREE },
        isActive: { type: Boolean, default: true },
        isEmailVerified: { type: Boolean, default: false },
        avatar: { type: String },
        stripeCustomerId: { type: String },
        stripeSubscriptionId: { type: String },
        currentPeriodEnd: { type: Date },
        language: { type: String, default: 'en' },
        theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
        resumeCount: { type: Number, default: 0 },
        analysisCount: { type: Number, default: 0 },
        linkedInUrl: { type: String },
        lastLoginAt: { type: Date },
        resetPasswordToken: { type: String },
        resetPasswordExpire: { type: Date },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc: unknown, ret: Record<string, unknown>) {
                delete ret.password;
                return ret;
            },
        },
    }
);

// Indexes
UserSchema.index({ subscriptionTier: 1 });
UserSchema.index({ stripeCustomerId: 1 });

// Hash password before save
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
});

// Compare password instance method
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
