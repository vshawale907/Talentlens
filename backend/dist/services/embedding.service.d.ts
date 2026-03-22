export declare const EMBEDDING_DIM = 1536;
/**
 * Generates a dense vector embedding for a given text.
 * Tries OpenAI first (text-embedding-3-small), falls back to Gemini embedding.
 *
 * @param text - The text to embed
 * @returns Float32 vector with EMBEDDING_DIM dimensions
 */
export declare function generateEmbedding(text: string): Promise<number[]>;
//# sourceMappingURL=embedding.service.d.ts.map