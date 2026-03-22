import mongoose, { Document, Model } from 'mongoose';
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
    embedding?: number[];
    viewCount: number;
    applicationCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const JobModel: Model<IJob>;
//# sourceMappingURL=Job.model.d.ts.map