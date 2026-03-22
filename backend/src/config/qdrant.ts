import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from './logger';

// ─── Qdrant Client ─────────────────────────────────────────────────────────
// By default, Qdrant runs on http://localhost:6333.
// Override with QDRANT_URL for cloud/managed deployments.
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
export const qdrantClient = new QdrantClient({
    url: QDRANT_URL,
    checkCompatibility: false,
    ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
});

// ─── Collection Names ────────────────────────────────────────────────────────
export const COLLECTION = {
    JOBS: 'jobs',
    RESUMES: 'resumes',
} as const;

// ─── Embedding Dimensions ────────────────────────────────────────────────────
// text-embedding-3-small → 1536 dims
// text-embedding-ada-002  → 1536 dims
export const EMBEDDING_DIM = 1536;

// ─── Initialise Collections ─────────────────────────────────────────────────
/**
 * Creates the Qdrant collections if they don't exist yet.
 * Safe to call on every server start — is idempotent.
 */
export async function initQdrantCollections(): Promise<void> {
    const existingCollections = await qdrantClient
        .getCollections()
        .then((r) => r.collections.map((c) => c.name))
        .catch(() => [] as string[]);

    for (const name of Object.values(COLLECTION)) {
        if (existingCollections.includes(name)) {
            logger.debug(`[Qdrant] Collection '${name}' already exists.`);
            continue;
        }
        await qdrantClient.createCollection(name, {
            vectors: {
                size: EMBEDDING_DIM,
                distance: 'Cosine', // Cosine similarity is best for semantic text matching
            },
            optimizers_config: {
                indexing_threshold: 20000, // Only build HNSW index after 20k vectors
            },
        });
        logger.info(`[Qdrant] Created collection '${name}'`);
    }
}
