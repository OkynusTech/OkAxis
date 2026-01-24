/**
 * Embedding Worker - Background Embedding Processing
 * 
 * Handles asynchronous artifact embedding to avoid blocking the UI.
 * Implements queue-based processing with retry logic.
 */

import { Artifact } from './types';
import { embedArtifact, shouldEmbedArtifact } from './embedding-service';
import { getVectorStore } from './vector-store';
import { updateArtifact } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingJob {
    id: string;
    artifactId: string;
    artifact: Artifact;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    attempts: number;
    maxAttempts: number;
    error?: string;
    queuedAt: string;
    startedAt?: string;
    completedAt?: string;
}

// ============================================================================
// Job Queue
// ============================================================================

class EmbeddingQueue {
    private queue: EmbeddingJob[] = [];
    private processing: Set<string> = new Set();
    private maxConcurrent: number = 3;
    private isProcessing: boolean = false;

    /**
     * Add artifact to embedding queue.
     */
    async enqueue(artifact: Artifact): Promise<void> {
        // Check if already queued or processing
        const existing = this.queue.find(j => j.artifactId === artifact.id);
        if (existing || this.processing.has(artifact.id)) {
            return;
        }

        // Check if embedding needed
        if (!shouldEmbedArtifact(artifact)) {
            return;
        }

        // Create job
        const job: EmbeddingJob = {
            id: `job_${Date.now()}_${artifact.id}`,
            artifactId: artifact.id,
            artifact,
            status: 'queued',
            attempts: 0,
            maxAttempts: 3,
            queuedAt: new Date().toISOString()
        };

        this.queue.push(job);

        // Update artifact status
        await updateArtifact(artifact.id, {
            ...artifact,
            embeddingStatus: 'pending'
        });

        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process jobs from queue.
     */
    private async processQueue(): Promise<void> {
        this.isProcessing = true;

        while (this.queue.length > 0 || this.processing.size > 0) {
            // Process up to maxConcurrent jobs
            while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
                const job = this.queue.shift();
                if (!job) break;

                this.processJob(job); // Fire and forget
            }

            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessing = false;
    }

    /**
     * Process a single embedding job.
     */
    private async processJob(job: EmbeddingJob): Promise<void> {
        this.processing.add(job.artifactId);
        job.status = 'processing';
        job.startedAt = new Date().toISOString();
        job.attempts++;

        try {
            // Update artifact status
            await updateArtifact(job.artifactId, {
                ...job.artifact,
                embeddingStatus: 'processing'
            });

            // Generate embeddings
            const result = await embedArtifact(job.artifact);

            if (result.embeddings.length === 0) {
                throw new Error('No embeddings generated');
            }

            // Update artifact with embeddings
            const updated: Artifact = {
                ...job.artifact,
                embeddings: result.embeddings,
                embeddingStatus: 'completed',
                lastEmbedded: new Date().toISOString()
            };

            await updateArtifact(job.artifactId, updated);

            // Add to vector store
            const vectorStore = await getVectorStore();
            vectorStore.add(updated);
            await vectorStore.persist();

            // Mark job complete
            job.status = 'completed';
            job.completedAt = new Date().toISOString();

            console.log(`Successfully embedded artifact ${job.artifactId} (${result.totalChunks} chunks, ${result.totalTokens} tokens, $${result.cost.toFixed(4)})`);

        } catch (error) {
            console.error(`Failed to embed artifact ${job.artifactId}:`, error);
            job.error = error instanceof Error ? error.message : 'Unknown error';

            // Retry if attempts remaining
            if (job.attempts < job.maxAttempts) {
                console.log(`Retrying artifact ${job.artifactId} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
                job.status = 'queued';
                this.queue.push(job);
            } else {
                // Mark as failed
                job.status = 'failed';
                await updateArtifact(job.artifactId, {
                    ...job.artifact,
                    embeddingStatus: 'failed'
                });
            }
        } finally {
            this.processing.delete(job.artifactId);
        }
    }

    /**
     * Get queue status.
     */
    getStatus(): {
        queued: number,
        processing: number,
        total: number
    } {
        return {
            queued: this.queue.length,
            processing: this.processing.size,
            total: this.queue.length + this.processing.size
        };
    }

    /**
     * Clear queue (for testing).
     */
    clear(): void {
        this.queue = [];
        this.processing.clear();
    }
}

// ============================================================================
// Global Queue Instance
// ============================================================================

const globalQueue = new EmbeddingQueue();

/**
 * Queue artifact for embedding.
 * Non-blocking - returns immediately.
 */
export async function queueArtifactForEmbedding(artifact: Artifact): Promise<void> {
    await globalQueue.enqueue(artifact);
}

/**
 * Get embedding queue status.
 */
export function getQueueStatus(): {
    queued: number,
    processing: number,
    total: number
} {
    return globalQueue.getStatus();
}

/**
 * Clear embedding queue (for testing).
 */
export function clearQueue(): void {
    globalQueue.clear();
}

// ============================================================================
// Batch Operations
// ===========================================================================

/**
 * Queue multiple artifacts for embedding.
 */
export async function queueArtifactsForEmbedding(artifacts: Artifact[]): Promise<void> {
    for (const artifact of artifacts) {
        await queueArtifactForEmbedding(artifact);
    }
}

/**
 * Re-embed all artifacts (useful after config changes).
 */
export async function reembedAllArtifacts(artifacts: Artifact[]): Promise<void> {
    for (const artifact of artifacts) {
        // Force re-embedding by clearing existing embeddings
        const updated: Artifact = {
            ...artifact,
            embeddings: undefined,
            embeddingStatus: 'pending',
            lastEmbedded: undefined
        };
        await updateArtifact(artifact.id, updated);
        await queueArtifactForEmbedding(updated);
    }
}
