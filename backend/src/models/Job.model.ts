import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    company: string;
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
    description: string;
    requirements: string[];
    preferredSkills: string[];
    salaryMin?: number;
    salaryMax?: number;
    currency: string;
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    requiredYearsOfExperience: number;
    industry: string;
    tags: string[];
    applicationUrl?: string;
    isActive: boolean;
    postedBy?: mongoose.Types.ObjectId;
    // Vector embedding for semantic search
    embedding?: number[];
    viewCount: number;
    applicationCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
    {
        title: { type: String, required: true, trim: true, index: 'text' },
        company: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'remote', 'internship'],
            default: 'full-time',
        },
        description: { type: String, required: true, index: 'text' },
        requirements: [{ type: String }],
        preferredSkills: [{ type: String }],
        salaryMin: { type: Number },
        salaryMax: { type: Number },
        currency: { type: String, default: 'USD' },
        experienceLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
            default: 'mid',
        },
        requiredYearsOfExperience: { type: Number, default: 0 },
        industry: { type: String, required: true },
        tags: [{ type: String }],
        applicationUrl: { type: String },
        isActive: { type: Boolean, default: true },
        postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        embedding: [{ type: Number }],  // For vector search (Pinecone / Atlas Vector)
        viewCount: { type: Number, default: 0 },
        applicationCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

JobSchema.index({ title: 'text', description: 'text', company: 'text' });
JobSchema.index({ industry: 1, isActive: 1 });
JobSchema.index({ experienceLevel: 1 });
JobSchema.index({ createdAt: -1 });

export const JobModel: Model<IJob> = mongoose.model<IJob>('Job', JobSchema);
