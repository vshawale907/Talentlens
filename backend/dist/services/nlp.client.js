"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nlpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class NLPServiceClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: env_1.config.AI_SERVICE_URL,
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' },
        });
        this.client.interceptors.request.use((cfg) => {
            logger_1.logger.debug(`NLP Service → ${cfg.method?.toUpperCase()} ${cfg.url}`);
            return cfg;
        });
        this.client.interceptors.response.use((res) => res, (err) => {
            logger_1.logger.error('NLP Service error:', err.response?.data || err.message);
            throw new errorHandler_1.AppError(`NLP service failed: ${err.response?.data?.detail || err.message}`, 502, 'NLP_SERVICE_ERROR');
        });
    }
    async analyzeResume(payload, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const { data } = await this.client.post('/analyze', payload);
                return data;
            }
            catch (err) {
                if (i === retries - 1)
                    throw err;
                logger_1.logger.warn(`NLP Service attempt ${i + 1} failed, retrying in 2s...`);
                await new Promise((res) => setTimeout(res, 2000));
            }
        }
        throw new errorHandler_1.AppError('NLP service failed after retries', 502, 'NLP_SERVICE_ERROR');
    }
    async healthCheck() {
        try {
            const { data } = await this.client.get('/health');
            return data.status === 'ok';
        }
        catch {
            return false;
        }
    }
}
exports.nlpClient = new NLPServiceClient();
//# sourceMappingURL=nlp.client.js.map