"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_DIM = exports.COLLECTION = exports.qdrantClient = void 0;
exports.initQdrantCollections = initQdrantCollections;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const logger_1 = require("./logger");
// ─── Qdrant Client ─────────────────────────────────────────────────────────
// By default, Qdrant runs on http://localhost:6333.
// Override with QDRANT_URL for cloud/managed deployments.
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: QDRANT_URL,
    checkCompatibility: false,
    ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
});
// ─── Collection Names ────────────────────────────────────────────────────────
exports.COLLECTION = {
    JOBS: 'jobs',
    RESUMES: 'resumes',
};
// ─── Embedding Dimensions ────────────────────────────────────────────────────
// text-embedding-3-small → 1536 dims
// text-embedding-ada-002  → 1536 dims
exports.EMBEDDING_DIM = 1536;
// ─── Initialise Collections ─────────────────────────────────────────────────
/**
 * Creates the Qdrant collections if they don't exist yet.
 * Safe to call on every server start — is idempotent.
 */
async function initQdrantCollections() {
    const existingCollections = await exports.qdrantClient
        .getCollections()
        .then((r) => r.collections.map((c) => c.name))
        .catch(() => []);
    for (const name of Object.values(exports.COLLECTION)) {
        if (existingCollections.includes(name)) {
            logger_1.logger.debug(`[Qdrant] Collection '${name}' already exists.`);
            continue;
        }
        await exports.qdrantClient.createCollection(name, {
            vectors: {
                size: exports.EMBEDDING_DIM,
                distance: 'Cosine', // Cosine similarity is best for semantic text matching
            },
            optimizers_config: {
                indexing_threshold: 20000, // Only build HNSW index after 20k vectors
            },
        });
        logger_1.logger.info(`[Qdrant] Created collection '${name}'`);
    }
}
//# sourceMappingURL=qdrant.js.map