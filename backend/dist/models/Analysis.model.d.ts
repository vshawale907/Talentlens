import mongoose, { Document, Model } from 'mongoose';
export interface INLPResult {
    extractedSkills: string[];
    softSkills: string[];
    experienceYears: number;
    similarityScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    keywordDensity: Record<string, number>;
    quantificationScore: number;
    bulletCount: number;
}
export interface IOpenAIResult {
    atsScore: number;
    qualityScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    bulletImpactScores: Array<{
        bullet: string;
        score: number;
        rewritten: string;
    }>;
    improvements: string[];
    interviewQuestions: Array<{
        question: string;
        category: string;
        difficulty: string;
    }>;
    coverLetter?: string;
    careerRoadmap?: {
        shortTerm: string[];
        mediumTerm: string[];
        longTerm: string[];
    };
    summary: string;
}
export interface IAnalysis extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    resume: mongoose.Types.ObjectId;
    job?: mongoose.Types.ObjectId;
    jobDescriptionText?: string;
    nlpResult?: INLPResult;
    openAIResult?: IOpenAIResult;
    processingTimeMs: number;
    aiModel: string;
    isLatest: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AnalysisModel: Model<IAnalysis>;
//# sourceMappingURL=Analysis.model.d.ts.map