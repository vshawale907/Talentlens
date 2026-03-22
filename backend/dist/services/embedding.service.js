"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_DIM = void 0;
exports.generateEmbedding = generateEmbedding;
const openai_1 = __importDefault(require("openai"));
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const openai = env_1.config.OPENAI_API_KEY ? new openai_1.default({ apiKey: env_1.config.OPENAI_API_KEY }) : null;
const genAI = env_1.config.GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(env_1.config.GEMINI_API_KEY) : null;
// ─── Embedding Dimension ────────────────────────────────────────────────────
exports.EMBEDDING_DIM = 1536; // text-embedding-3-small or ada-002
/**
 * Generates a dense vector embedding for a given text.
 * Tries OpenAI first (text-embedding-3-small), falls back to Gemini embedding.
 *
 * @param text - The text to embed
 * @returns Float32 vector with EMBEDDING_DIM dimensions
 */
async function generateEmbedding(text) {
    // Trim text to avoid token limits — embeddings work well on 512-1024 token chunks
    const truncated = text.slice(0, 6000);
    // ── OpenAI Embedding (preferred) ──────────────────────────────────────────
    if (openai) {
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small', // 1536 dims, cost-efficient
                input: truncated,
            });
            logger_1.logger.debug('[Embedding] Generated via OpenAI text-embedding-3-small');
            return response.data[0].embedding;
        }
        catch (err) {
            logger_1.logger.warn(`[Embedding] OpenAI embedding failed: ${err?.message}. Falling back to Gemini...`);
        }
    }
    // ── Gemini Embedding (fallback) ───────────────────────────────────────────
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
            const result = await model.embedContent({
                content: { role: 'user', parts: [{ text: truncated }] },
                taskType: generative_ai_1.TaskType.SEMANTIC_SIMILARITY,
            });
            const raw = result.embedding.values;
            // Gemini text-embedding-004 returns 768 dims — pad to 1536 to match our Qdrant collection
            const padded = new Array(exports.EMBEDDING_DIM).fill(0);
            raw.forEach((v, i) => { if (i < exports.EMBEDDING_DIM)
                padded[i] = v; });
            logger_1.logger.debug('[Embedding] Generated via Gemini text-embedding-004 (padded to 1536)');
            return padded;
        }
        catch (err) {
            logger_1.logger.warn(`[Embedding] Gemini embedding failed: ${err?.message}`);
        }
    }
    // If both fail, return a zero vector to prevent a hard crash.
    // Semantic search will score 0 for this document, which is an acceptable degraded state.
    logger_1.logger.error('[Embedding] All embedding providers failed. Returning zero vector.');
    return new Array(exports.EMBEDDING_DIM).fill(0);
}
//# sourceMappingURL=embedding.service.js.map