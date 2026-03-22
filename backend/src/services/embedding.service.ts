import OpenAI from 'openai';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../config/logger';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;
const genAI = config.GEMINI_API_KEY ? new GoogleGenerativeAI(config.GEMINI_API_KEY) : null;

// ─── Embedding Dimension ────────────────────────────────────────────────────
export const EMBEDDING_DIM = 1536; // text-embedding-3-small or ada-002

/**
 * Generates a dense vector embedding for a given text.
 * Tries OpenAI first (text-embedding-3-small), falls back to Gemini embedding.
 *
 * @param text - The text to embed
 * @returns Float32 vector with EMBEDDING_DIM dimensions
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Trim text to avoid token limits — embeddings work well on 512-1024 token chunks
    const truncated = text.slice(0, 6000);

    // ── OpenAI Embedding (preferred) ──────────────────────────────────────────
    if (openai) {
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small', // 1536 dims, cost-efficient
                input: truncated,
            });
            logger.debug('[Embedding] Generated via OpenAI text-embedding-3-small');
            return response.data[0].embedding;
        } catch (err: any) {
            logger.warn(`[Embedding] OpenAI embedding failed: ${err?.message}. Falling back to Gemini...`);
        }
    }

    // ── Gemini Embedding (fallback) ───────────────────────────────────────────
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
            const result = await model.embedContent({
                content: { role: 'user', parts: [{ text: truncated }] },
                taskType: TaskType.SEMANTIC_SIMILARITY,
            });
            const raw = result.embedding.values;
            // Gemini text-embedding-004 returns 768 dims — pad to 1536 to match our Qdrant collection
            const padded = new Array(EMBEDDING_DIM).fill(0);
            raw.forEach((v, i) => { if (i < EMBEDDING_DIM) padded[i] = v; });
            logger.debug('[Embedding] Generated via Gemini text-embedding-004 (padded to 1536)');
            return padded;
        } catch (err: any) {
            logger.warn(`[Embedding] Gemini embedding failed: ${err?.message}`);
        }
    }

    // If both fail, return a zero vector to prevent a hard crash.
    // Semantic search will score 0 for this document, which is an acceptable degraded state.
    logger.error('[Embedding] All embedding providers failed. Returning zero vector.');
    return new Array(EMBEDDING_DIM).fill(0);
}
