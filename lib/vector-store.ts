/**
 * Vector Store - In-Memory Vector Search
 * 
 * Lightweight vector database for semantic artifact search.
 * Uses cosine similarity for relevance ranking.
 * 
 * MIGRATION PATH: This in-memory implementation is for MVP.
 * For production scale (>10K artifacts), migrate to:
 * - pgvector (PostgreSQL extension)
 * - Pinecone (cloud vector DB)
 * - Weaviate (self-hosted alternative)
 */

import { ArtifactEmbedding, Artifact } from './types';
import { cosineSimilarity } from './embedding-service';

// ============================================================================
// Types
// ============================================================================

interface StoredEmbedding {
    embedding: ArtifactEmbedding;
    artifact: Artifact;
}

export interface VectorSearchOptions {
    topK?: number;
    minSimilarity?: number;
    filter?: (embedding: ArtifactEmbedding, artifact: Artifact) => boolean;
}

export interface VectorSearchResult {
    embedding: ArtifactEmbedding;
    artifact: Artifact;
    similarity: number;
}

// ============================================================================
// Vector Store Class
// ============================================================================

export class VectorStore {
    private embeddings: Map<string, StoredEmbedding[]> = new Map();

    /**
     * Add artifact embeddings to the store.
     * 
     * @param artifact - Artifact with embeddings
     */
    add(artifact: Artifact): void {
        if (!artifact.embeddings || artifact.embeddings.length === 0) {
            return;
        }

        const stored: StoredEmbedding[] = artifact.embeddings.map(embedding => ({
            embedding,
            artifact
        }));

        this.embeddings.set(artifact.id, stored);
    }

    /**
     * Update artifact embeddings (replaces existing).
     * 
     * @param artifact - Artifact with updated embeddings
     */
    update(artifact: Artifact): void {
        this.remove(artifact.id);
        this.add(artifact);
    }

    /**
     * Remove artifact embeddings from store.
     * 
     * @param artifactId - ID of artifact to remove
     */
    remove(artifactId: string): void {
        this.embeddings.delete(artifactId);
    }

    /**
     * Search for similar embeddings.
     * 
     * @param query - Query embedding vector
     * @param options - Search options
     * @returns Ranked results by similarity
     */
    search(query: number[], options: VectorSearchOptions = {}): VectorSearchResult[] {
        const {
            topK = 10,
            minSimilarity = 0.0,
            filter
        } = options;

        const results: VectorSearchResult[] = [];

        // Iterate through all stored embeddings
        for (const stored of this.embeddings.values()) {
            for (const { embedding, artifact } of stored) {
                // Apply filter if provided
                if (filter && !filter(embedding, artifact)) {
                    continue;
                }

                // Calculate similarity
                const similarity = cosineSimilarity(query, embedding.embedding);

                // Check threshold
                if (similarity >= minSimilarity) {
                    results.push({
                        embedding,
                        artifact,
                        similarity
                    });
                }
            }
        }

        // Sort by similarity (highest first) and return top K
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, topK);
    }

    /**
     * Get all embeddings for an artifact.
     * 
     * @param artifactId - Artifact ID
     * @returns Stored embeddings or empty array
     */
    get(artifactId: string): StoredEmbedding[] {
        return this.embeddings.get(artifactId) || [];
    }

    /**
     * Check if artifact is in store.
     * 
     * @param artifactId - Artifact ID
     * @returns true if artifact has embeddings in store
     */
    has(artifactId: string): boolean {
        return this.embeddings.has(artifactId);
    }

    /**
     * Get total number of embeddings in store.
     */
    size(): number {
        let total = 0;
        for (const stored of this.embeddings.values()) {
            total += stored.length;
        }
        return total;
    }

    /**
     * Get total number of artifacts in store.
     */
    artifactCount(): number {
        return this.embeddings.size;
    }

    /**
     * Clear all embeddings from store.
     */
    clear(): void {
        this.embeddings.clear();
    }

    /**
     * Persist store to localStorage.
     * 
     * WARNING: This is for development only.
     * Embeddings are large - do not use localStorage in production.
     */
    async persist(key: string = 'vector_store'): Promise<void> {
        if (typeof window === 'undefined') return;

        const data: Record<string, StoredEmbedding[]> = {};
        for (const [artifactId, stored] of this.embeddings.entries()) {
            data[artifactId] = stored;
        }

        try {
            const serialized = JSON.stringify(data);

            // Guard: skip persistence if data exceeds 2MB to avoid localStorage quota issues
            const sizeBytes = new Blob([serialized]).size;
            if (sizeBytes > 2 * 1024 * 1024) {
                console.warn(
                    `[VectorStore] Skipping localStorage persistence: data size (${(sizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds 2MB safety threshold. ` +
                    `Consider migrating to IndexedDB for production use.`
                );
                return;
            }

            localStorage.setItem(key, serialized);
        } catch (error) {
            console.error('Failed to persist vector store:', error);
            // Likely quota exceeded - clear old data
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // Give up
            }
        }
    }

    /**
     * Load store from localStorage.
     */
    async load(key: string = 'vector_store'): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            const data = localStorage.getItem(key);
            if (!data) return;

            const parsed: Record<string, StoredEmbedding[]> = JSON.parse(data);
            this.embeddings.clear();

            for (const [artifactId, stored] of Object.entries(parsed)) {
                this.embeddings.set(artifactId, stored);
            }
        } catch (error) {
            console.error('Failed to load vector store:', error);
        }
    }
}

// ============================================================================
// Global Store Instance
// ============================================================================

let globalStore: VectorStore | null = null;

/**
 * Get the global vector store instance.
 * Lazily initializes and loads from localStorage.
 */
export async function getVectorStore(): Promise<VectorStore> {
    if (!globalStore) {
        globalStore = new VectorStore();
        await globalStore.load();
    }
    return globalStore;
}

/**
 * Reset the global vector store.
 * Useful for testing.
 */
export function resetVectorStore(): void {
    globalStore = new VectorStore();
}
