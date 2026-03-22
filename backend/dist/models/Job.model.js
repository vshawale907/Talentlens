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
exports.JobModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const JobSchema = new mongoose_1.Schema({
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
    postedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    embedding: [{ type: Number }], // For vector search (Pinecone / Atlas Vector)
    viewCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 },
}, { timestamps: true });
JobSchema.index({ title: 'text', description: 'text', company: 'text' });
JobSchema.index({ industry: 1, isActive: 1 });
JobSchema.index({ experienceLevel: 1 });
JobSchema.index({ createdAt: -1 });
exports.JobModel = mongoose_1.default.model('Job', JobSchema);
//# sourceMappingURL=Job.model.js.map