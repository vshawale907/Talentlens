import { create } from 'zustand';

interface NLPResult {
    extractedSkills: string[];
    softSkills: string[];
    experienceYears: number;
    similarityScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    keywordDensity: Record<string, number>;
}

interface OpenAIResult {
    atsScore: number;
    qualityScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    bulletImpactScores: Array<{ bullet: string; score: number; rewritten: string }>;
    summary: string;
}

interface Resume {
    _id: string;
    title: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    status: string;
    createdAt: string;
}

interface Analysis {
    _id: string;
    nlpResult?: NLPResult;
    openAIResult?: OpenAIResult;
    version: number;
    createdAt: string;
}

interface ResumeState {
    resumes: Resume[];
    selectedResumeId: string | null;
    currentAnalysis: Analysis | null;
    isAnalyzing: boolean;
    isUploading: boolean;
    setResumes: (resumes: Resume[]) => void;
    addResume: (resume: Resume) => void;
    removeResume: (id: string) => void;
    selectResume: (id: string | null) => void;
    setAnalysis: (analysis: Analysis | null) => void;
    setAnalyzing: (v: boolean) => void;
    setUploading: (v: boolean) => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
    resumes: [],
    selectedResumeId: null,
    currentAnalysis: null,
    isAnalyzing: false,
    isUploading: false,
    setResumes: (resumes) => set({ resumes }),
    addResume: (resume) => set((s) => ({ resumes: [resume, ...s.resumes] })),
    removeResume: (id) => set((s) => ({ resumes: s.resumes.filter((r) => r._id !== id) })),
    selectResume: (id) => set({ selectedResumeId: id, currentAnalysis: null }),
    setAnalysis: (analysis) => set({ currentAnalysis: analysis }),
    setAnalyzing: (v) => set({ isAnalyzing: v }),
    setUploading: (v) => set({ isUploading: v }),
}));
