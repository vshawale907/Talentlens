import type { NLPAnalysisResult } from './nlp.client';
export declare const extractNLPDataFallback: (resumeText: string, jobDescription?: string) => Promise<NLPAnalysisResult>;
export interface ATSScoreResult {
    atsScore: number;
    qualityScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    summary: string;
    bulletImpactScores: Array<{
        bullet: string;
        score: number;
        rewritten: string;
    }>;
}
export declare const scoreResume: (resumeText: string, nlpData: NLPAnalysisResult, jobDescription?: string) => Promise<ATSScoreResult>;
export interface InterviewQuestionsResult {
    behavioural: Array<{
        question: string;
        category: string;
        difficulty: string;
        hint: string;
    }>;
    technical: Array<{
        question: string;
        category: string;
        difficulty: string;
        hint: string;
    }>;
    situational: Array<{
        question: string;
        category: string;
        difficulty: string;
        hint: string;
    }>;
}
export declare const generateInterviewQuestions: (nlpData: NLPAnalysisResult, jobTitle: string, jobDescription?: string) => Promise<InterviewQuestionsResult>;
export interface CoverLetterResult {
    coverLetter: string;
    wordCount: number;
}
export declare const generateCoverLetter: (resumeText: string, nlpData: NLPAnalysisResult, jobTitle: string, company: string, jobDescription?: string) => Promise<CoverLetterResult>;
export interface CustomCoverLetterParams {
    fullName: string;
    email: string;
    phone: string;
    jobTitle: string;
    company: string;
    skills: string;
    experience: string;
    projectTitle: string;
    projectDesc: string;
    education: string;
    whyInterested: string;
}
export declare const generateCustomCoverLetter: (params: CustomCoverLetterParams) => Promise<CoverLetterResult>;
export interface CareerRoadmapResult {
    currentLevel: string;
    targetRole: string;
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
    certifications: string[];
    courses: string[];
}
export declare const generateCareerRoadmap: (nlpData: NLPAnalysisResult, targetRole: string) => Promise<CareerRoadmapResult>;
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export declare const chatWithCoach: (messages: ChatMessage[], resumeContext?: string, nlpData?: NLPAnalysisResult) => Promise<string>;
export type CoachingMode = 'general' | 'resume_review' | 'skill_gap' | 'interview_prep' | 'career_guidance' | 'bullet_rewrite' | 'interview_sim';
export interface CoachStructuredResponse {
    feedback: string;
    improvements: string[];
    example: string;
    mode: CoachingMode;
}
export declare const chatWithCoachStructured: (messages: ChatMessage[], mode: CoachingMode, resumeContext?: string, nlpData?: NLPAnalysisResult, bulletText?: string) => Promise<CoachStructuredResponse>;
//# sourceMappingURL=openai.service.d.ts.map