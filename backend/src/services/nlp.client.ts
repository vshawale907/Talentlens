import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

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
    quantificationScore: number;
    bulletCount: number;
}

class NLPServiceClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.AI_SERVICE_URL,
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' },
        });

        this.client.interceptors.request.use((cfg) => {
            logger.debug(`NLP Service → ${cfg.method?.toUpperCase()} ${cfg.url}`);
            return cfg;
        });

        this.client.interceptors.response.use(
            (res) => res,
            (err) => {
                logger.error('NLP Service error:', err.response?.data || err.message);
                throw new AppError(
                    `NLP service failed: ${err.response?.data?.detail || err.message}`,
                    502,
                    'NLP_SERVICE_ERROR'
                );
            }
        );
    }

    async analyzeResume(payload: NLPAnalysisRequest, retries = 3): Promise<NLPAnalysisResult> {
        for (let i = 0; i < retries; i++) {
            try {
                const { data } = await this.client.post<NLPAnalysisResult>('/analyze', payload);
                return data;
            } catch (err) {
                if (i === retries - 1) throw err;
                logger.warn(`NLP Service attempt ${i + 1} failed, retrying in 2s...`);
                await new Promise((res) => setTimeout(res, 2000));
            }
        }
        throw new AppError('NLP service failed after retries', 502, 'NLP_SERVICE_ERROR');
    }

    async healthCheck(): Promise<boolean> {
        try {
            const { data } = await this.client.get<{ status: string }>('/health');
            return data.status === 'ok';
        } catch {
            return false;
        }
    }
}

export const nlpClient = new NLPServiceClient();
