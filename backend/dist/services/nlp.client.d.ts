export interface NLPAnalysisRequest {
    resumeText: string;
    jobDescriptionText?: string;
}
export interface NLPAnalysisResult {
    extractedSkills: string[];
    softSkills: string[];
    experienceYears: number;
    similarityScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    keywordDensity: Record<string, number>;
}
declare class NLPServiceClient {
    private client;
    constructor();
    analyzeResume(payload: NLPAnalysisRequest): Promise<NLPAnalysisResult>;
    healthCheck(): Promise<boolean>;
}
export declare const nlpClient: NLPServiceClient;
export {};
//# sourceMappingURL=nlp.client.d.ts.map