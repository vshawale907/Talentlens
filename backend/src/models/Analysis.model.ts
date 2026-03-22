import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INLPResult {
    extractedSkills: string[];
    softSkills: string[];
    experienceYears: number;
    similarityScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    keywordDensity: Record<string, number>;
}

export interface IOpenAIResult {
    atsScore: number;
    qualityScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    bulletImpactScores: Array<{ bullet: string; score: number; rewritten: string }>;
    improvements: string[];
    interviewQuestions: Array<{ question: string; category: string; difficulty: string }>;
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

const NLPResultSchema = new Schema<INLPResult>(
    {
        extractedSkills: [String],
        softSkills: [String],
        experienceYears: Number,
        similarityScore: Number,
        matchedSkills: [String],
        missingSkills: [String],
        keywordDensity: { type: Map, of: Number },
    },
    { _id: false }
);

const BulletImpactSchema = new Schema(
    { bullet: String, score: Number, rewritten: String },
    { _id: false }
);

const InterviewQuestionSchema = new Schema(
    { question: String, category: String, difficulty: String },
    { _id: false }
);

const OpenAIResultSchema = new Schema<IOpenAIResult>(
    {
        atsScore: { type: Number, min: 0, max: 100 },
        qualityScore: { type: Number, min: 0, max: 100 },
        overallScore: { type: Number, min: 0, max: 100 },
        strengths: [String],
        weaknesses: [String],
        bulletImpactScores: [BulletImpactSchema],
        improvements: [String],
        interviewQuestions: [InterviewQuestionSchema],
        coverLetter: String,
        careerRoadmap: {
            shortTerm: [String],
            mediumTerm: [String],
            longTerm: [String],
        },
        summary: String,
    },
    { _id: false }
);

const AnalysisSchema = new Schema<IAnalysis>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        resume: { type: Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
        job: { type: Schema.Types.ObjectId, ref: 'Job' },
        jobDescriptionText: { type: String },
        nlpResult: NLPResultSchema,
        openAIResult: OpenAIResultSchema,
        processingTimeMs: { type: Number, default: 0 },
        aiModel: { type: String, default: 'gpt-4o' },
        isLatest: { type: Boolean, default: true },
        version: { type: Number, default: 1 },
    },
    { timestamps: true }
);

AnalysisSchema.index({ user: 1, createdAt: -1 });
AnalysisSchema.index({ resume: 1, isLatest: 1 });

export const AnalysisModel: Model<IAnalysis> = mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
