"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NLPResultSchema = new mongoose_1.Schema({
    extractedSkills: [String],
    softSkills: [String],
    experienceYears: Number,
    similarityScore: Number,
    matchedSkills: [String],
    missingSkills: [String],
    keywordDensity: { type: Map, of: Number },
    quantificationScore: Number,
    bulletCount: Number,
}, { _id: false });
const BulletImpactSchema = new mongoose_1.Schema({ bullet: String, score: Number, rewritten: String }, { _id: false });
const InterviewQuestionSchema = new mongoose_1.Schema({ question: String, category: String, difficulty: String }, { _id: false });
const OpenAIResultSchema = new mongoose_1.Schema({
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
}, { _id: false });
const AnalysisSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resume: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    job: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Job' },
    jobDescriptionText: { type: String },
    nlpResult: NLPResultSchema,
    openAIResult: OpenAIResultSchema,
    processingTimeMs: { type: Number, default: 0 },
    aiModel: { type: String, default: 'gpt-4o' },
    isLatest: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
}, { timestamps: true });
AnalysisSchema.index({ user: 1, createdAt: -1 });
AnalysisSchema.index({ resume: 1, isLatest: 1 });
exports.AnalysisModel = mongoose_1.default.model('Analysis', AnalysisSchema);
//# sourceMappingURL=Analysis.model.js.map