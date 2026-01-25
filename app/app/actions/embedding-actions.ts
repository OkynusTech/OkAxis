/**
 * Server Action - Generate Embeddings
 * 
 * This runs in Node.js server environment where transformers.js works properly.
 * Browser calls this via server action to avoid compatibility issues.
 */

'use server';

import { ArtifactEmbedding } from '@/lib/types';

// ============================================================================
// Server-Side Embedding Model (Node.js only)
// ============================================================================

let embeddingPipeline: any = null;

async function getEmbeddingModel() {
    if (embeddingPipeline) return embeddingPipeline;

    try {
        // Dynamic import only works in Node.js server environment
        const { pipeline } = await import('@xenova/transformers');

        embeddingPipeline = await pipeline(
            'feature-extraction',
            'Xenova/bge-small-en-v1.5'
        );

        console.log('✅ Server-side embedding model initialized (BAAI/bge-small-en-v1.5)');
        return embeddingPipeline;
    } catch (error) {
        console.error('Failed to initialize server-side embedding model:', error);
        throw error;
    }
}

/**
 * Generate embedding for a single text chunk (server-side).
 */
export async function generateEmbeddingServerSide(text: string): Promise<number[]> {
    try {
        const model = await getEmbeddingModel();

        const output = await model(text, {
            pooling: 'mean',
            normalize: true
        });

        return Array.from(output.data) as number[];
    } catch (error) {
        console.error('Server-side embedding generation failed:', error);
        // Return zero vector to avoid breaking the system
        return new Array(384).fill(0);
    }
}

/**
 * Generate embeddings for multiple text chunks (batched for efficiency).
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
        const embedding = await generateEmbeddingServerSide(text);
        embeddings.push(embedding);
    }

    return embeddings;
}

/**
 * Chunk text and generate embeddings (full workflow).
 */
export async function embedTextChunks(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
): Promise<Array<{ content: string, embedding: number[], startOffset: number, endOffset: number }>> {
    // Simple chunking (roughly 4 chars = 1 token)
    const approxCharsPerChunk = chunkSize * 4;
    const approxOverlapChars = overlap * 4;

    const chunks: Array<{ content: string, startOffset: number, endOffset: number }> = [];
    let currentOffset = 0;

    while (currentOffset < text.length) {
        const endOffset = Math.min(currentOffset + approxCharsPerChunk, text.length);
        const chunk = text.slice(currentOffset, endOffset);

        chunks.push({
            content: chunk,
            startOffset: currentOffset,
            endOffset: endOffset
        });

        currentOffset += Math.max(approxCharsPerChunk - approxOverlapChars, 1);
        if (currentOffset >= text.length) break;
    }

    // Generate embeddings for all chunks
    const results = [];
    for (const chunk of chunks) {
        const embedding = await generateEmbeddingServerSide(chunk.content);
        results.push({
            ...chunk,
            embedding
        });
    }

    return results;
}
