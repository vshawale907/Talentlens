import { QdrantClient } from '@qdrant/js-client-rest';
export declare const qdrantClient: QdrantClient;
export declare const COLLECTION: {
    readonly JOBS: "jobs";
    readonly RESUMES: "resumes";
};
export declare const EMBEDDING_DIM = 1536;
/**
 * Creates the Qdrant collections if they don't exist yet.
 * Safe to call on every server start — is idempotent.
 */
export declare function initQdrantCollections(): Promise<void>;
//# sourceMappingURL=qdrant.d.ts.map