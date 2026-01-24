/**
 * Embedding Service - Semantic Artifact Indexing
 * 
 * Transforms artifacts into searchable vector embeddings using OpenAI's text-embedding-ada-002.
 * Supports chunking for large artifacts and hierarchical scoping.
 * 
 * CRITICAL: All embeddings respect same scoping as artifacts.
 * Cross-client contamination is a system failure.
 */

import { Artifact, ArtifactEmbedding, ArtifactType, EmbeddingConfig } from './types';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: EmbeddingConfig = {
    model: 'Xenova/bge-small-en-v1.5', // BGE model - optimized for retrieval
    chunkSize: 500,
    chunkOverlap: 50,
    enabledArtifactTypes: [
        'walkthrough-transcript',
        'architecture-notes',
        'remediation-plan',
        'remediation-verification',
        'annotation-engineer',
        'scope-document',
        'architecture-document'
    ],
    batchSize: 10
};

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingResult {
    embeddings: ArtifactEmbedding[];
    totalChunks: number;
    totalTokens: number;
    cost: number; // Estimated cost in USD
}

export interface SimilaritySearchResult {
    artifactId: string;
    artifact: Artifact;
    chunkIndex: number;
    content: string;
    similarity: number; // 0.0 - 1.0 (cosine similarity)
    metadata: {
        scope: string;
        scopeId: string;
        artifactType: ArtifactType;
    };
}

// ============================================================================
// Text Chunking
// ============================================================================

/**
 * Split text into overlapping chunks for embedding.
 * Uses token estimation (roughly 4 chars = 1 token).
 */
function chunkText(text: string, chunkSize: number, overlap: number): Array<{ content: string, startOffset: number, endOffset: number }> {
    const chunks: Array<{ content: string, startOffset: number, endOffset: number }> = [];
    const approxCharsPerChunk = chunkSize * 4; // Rough estimate
    const approxOverlapChars = overlap * 4;

    let currentOffset = 0;
    while (currentOffset < text.length) {
        const endOffset = Math.min(currentOffset + approxCharsPerChunk, text.length);
        const chunk = text.slice(currentOffset, endOffset);

        chunks.push({
            content: chunk,
            startOffset: currentOffset,
            endOffset: endOffset
        });

        // Move forward by (chunkSize - overlap) to create overlap
        if (approxCharsPerChunk - approxOverlapChars > 0) {
            currentOffset += (approxCharsPerChunk - approxOverlapChars);
        } else {
            // If overlap is greater than or equal to chunk size, just move by 1 to prevent infinite loop
            currentOffset += 1;
        }

        // Prevent infinite loop on very small texts
        if (currentOffset >= text.length) break;
    }

    return chunks;
}

/**
 * Rough token count estimation (4 chars ≈ 1 token)
 */
function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

// ============================================================================
// Server-Side Embedding (via Server Actions)
// ============================================================================

/**
 * Generate embedding vector using server-side transformers.js.
 * 
 * This calls a Next.js server action that runs in Node.js,
 * avoiding browser compatibility issues with transformers.js.
 * 
 * @param text - Text to embed
 * @returns 384-dimensional embedding vector
 */
async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // Call server action (runs in Node.js where transformers.js works)
        const { generateEmbeddingServerSide } = await import('@/app/actions/embedding-actions');
        return await generateEmbeddingServerSide(text);
    } catch (error) {
        console.error('Failed to generate embedding:', error);

        // Fallback: return zero vector to avoid breaking the system
        console.warn('Returning zero vector as fallback');
        return new Array(384).fill(0);
    }
}

// ============================================================================
// Main Embedding Functions
// ============================================================================

/**
 * Embed an artifact into searchable chunks.
 * 
 * @param artifact - Artifact to embed
 * @param config - Optional embedding configuration
 * @returns Embedding result with all chunks
 */
export async function embedArtifact(
    artifact: Artifact,
    config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<EmbeddingResult> {
    // Check if artifact type should be embedded
    if (!config.enabledArtifactTypes.includes(artifact.type)) {
        return {
            embeddings: [],
            totalChunks: 0,
            totalTokens: 0,
            cost: 0
        };
    }

    // Extract text content
    const content = artifact.content || '';
    if (!content.trim()) {
        return {
            embeddings: [],
            totalChunks: 0,
            totalTokens: 0,
            cost: 0
        };
    }

    // Chunk the text
    const chunks = chunkText(content, config.chunkSize, config.chunkOverlap);

    // Generate embeddings for each chunk
    const embeddings: ArtifactEmbedding[] = [];
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const tokenCount = estimateTokenCount(chunk.content);
        totalTokens += tokenCount;

        try {
            const embedding = await generateEmbedding(chunk.content);

            embeddings.push({
                id: `${artifact.id}_chunk_${i}`,
                artifactId: artifact.id,
                chunkIndex: i,
                embedding,
                content: chunk.content,
                metadata: {
                    tokenCount,
                    startOffset: chunk.startOffset,
                    endOffset: chunk.endOffset,
                    createdAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error(`Failed to embed chunk ${i} of artifact ${artifact.id}:`, error);
            throw error;
        }
    }

    // Estimate cost (LOCAL MODEL - FREE!)
    const cost = 0; // No cost for local embeddings

    return {
        embeddings,
        totalChunks: chunks.length,
        totalTokens,
        cost
    };
}

/**
 * Check if artifact should be re-embedded.
 * 
 * @param artifact - Artifact to check
 * @returns true if embedding is needed
 */
export function shouldEmbedArtifact(artifact: Artifact, config: EmbeddingConfig = DEFAULT_CONFIG): boolean {
    // Check if type is embeddable
    if (!config.enabledArtifactTypes.includes(artifact.type)) {
        return false;
    }

    // Check if content exists
    if (!artifact.content || !artifact.content.trim()) {
        return false;
    }

    // Embed if no embeddings exist
    if (!artifact.embeddings || artifact.embeddings.length === 0) {
        return true;
    }

    // Embed if content was updated after last embedding
    if (artifact.lastEmbedded && artifact.updatedAt > artifact.lastEmbedded) {
        return true;
    }

    // Embed if status is failed
    if (artifact.embeddingStatus === 'failed') {
        return true;
    }

    return false;
}

/**
 * Calculate cosine similarity between two vectors.
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score (0.0 - 1.0, higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search for similar artifacts using semantic similarity.
 * 
 * NOTE: This is a basic in-memory implementation.
 * For production scale, migrate to pgvector or Pinecone.
 * 
 * @param query - Query text to search for
 * @param artifacts - Artifacts to search within (must be pre-filtered by scope)
 * @param topK - Number of results to return
 * @param minSimilarity - Minimum similarity threshold (0.0 - 1.0)
 * @returns Similar artifact chunks ranked by similarity
 */
export async function searchSimilarArtifacts(
    query: string,
    artifacts: Artifact[],
    topK: number = 5,
    minSimilarity: number = 0.75
): Promise<SimilaritySearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Collect all embeddings from all artifacts
    const allResults: SimilaritySearchResult[] = [];

    for (const artifact of artifacts) {
        if (!artifact.embeddings || artifact.embeddings.length === 0) {
            continue;
        }

        for (const embedding of artifact.embeddings) {
            const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);

            if (similarity >= minSimilarity) {
                allResults.push({
                    artifactId: artifact.id,
                    artifact,
                    chunkIndex: embedding.chunkIndex,
                    content: embedding.content,
                    similarity,
                    metadata: {
                        scope: artifact.scope,
                        scopeId: artifact.scopeId,
                        artifactType: artifact.type
                    }
                });
            }
        }
    }

    // Sort by similarity (highest first) and return top K
    allResults.sort((a, b) => b.similarity - a.similarity);
    return allResults.slice(0, topK);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get embedding statistics for an artifact.
 */
export function getEmbeddingStats(artifact: Artifact): {
    isEmbedded: boolean,
    chunkCount: number,
    totalTokens: number,
    status: string
} {
    return {
        isEmbedded: (artifact.embeddings && artifact.embeddings.length > 0) || false,
        chunkCount: artifact.embeddings?.length || 0,
        totalTokens: artifact.embeddings?.reduce((sum, e) => sum + e.metadata.tokenCount, 0) || 0,
        status: artifact.embeddingStatus || 'not_started'
    };
}

/**
 * Estimate embedding cost for an artifact.
 * LOCAL MODEL - Always free!
 */
export function estimateEmbeddingCost(artifact: Artifact): number {
    return 0; // Local embeddings are free
}
