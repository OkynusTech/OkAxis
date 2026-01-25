/**
 * Component Extraction Service
 * 
 * Automatically extracts application components from finding text.
 * Uses pattern matching to identify:
 * - API endpoints (e.g., /api/users/:id)
 * - Services/modules (e.g., AuthService, UserController)
 * - Database entities (e.g., users_table, orders collection)
 * - File paths and uploads
 * 
 * Future: Integrate NER (Named Entity Recognition) for broader coverage.
 */

import { Finding, ExtractedComponent, ComponentType, TrustZone } from './types';

export class ComponentExtractor {
    /**
     * Regex patterns for different component types
     */
    private static patterns: Record<string, RegExp[]> = {
        endpoint: [
            /\/(api|v\d+|graphql)\/[\w\-\/\:]+/gi,        // /api/users/:id
            /https?:\/\/[\w\.-]+\/[\w\-\/\:]*/gi,         // Full URLs with paths
            /\b(GET|POST|PUT|DELETE|PATCH)\s+\/[\w\-\/\:]+/gi, // HTTP methods
        ],
        database: [
            /\b(\w+)_(table|collection|db|schema)\b/gi,   // users_table
            /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\s+(FROM\s+)?(\w+)/gi, // SQL references
            /\bmongo\.(\w+)\./gi,                         // MongoDB collections
        ],
        service: [
            /\b(\w+)(Service|Controller|Handler|Manager|Repository|DAO)\b/g,
            /\bclass\s+(\w+)(Service|Controller|Handler|Manager)\b/g,
        ],
        file: [
            /\b[\w\-\.]+\.(jpg|jpeg|png|gif|pdf|xml|json|csv|txt|log|zip)\b/gi,
            /\/var\/www\/[\w\-\/\.]+/gi,  // Unix paths
            /C:\\[\w\-\\\.]+/gi,          // Windows paths
        ],
        'external-api': [
            /https?:\/\/api\.[\w\.-]+/gi,                // External API domains
            /\b(stripe|twilio|sendgrid|aws|azure|gcp)\.[\w\.-]+/gi,
        ],
    };

    /**
     * Extract components from finding text
     */
    static extractFromFinding(finding: Finding): ExtractedComponent[] {
        const text = this.buildSearchText(finding);
        const extracted: ExtractedComponent[] = [];

        // Run pattern matching for each component type
        for (const [typeStr, patterns] of Object.entries(this.patterns)) {
            const type = typeStr as ComponentType;

            for (const pattern of patterns) {
                const matches = text.matchAll(pattern);

                for (const match of matches) {
                    const name = this.cleanComponentName(match[0], type);

                    // Skip if too generic
                    if (this.isTooGeneric(name)) continue;

                    extracted.push({
                        name,
                        type,
                        confidence: 0.8, // Pattern-based has high confidence
                        extractionMethod: 'auto-pattern',
                        context: this.getContext(text, match.index!),
                        suggestedTrustZone: this.inferTrustZone(name, type),
                    });
                }
            }
        }

        return this.deduplicateComponents(extracted);
    }

    /**
     * Build search text from finding fields
     */
    private static buildSearchText(finding: Finding): string {
        const parts = [
            finding.title,
            finding.description,
            finding.impact,
            finding.remediation,
            finding.stepsToReproduce || '',
            finding.proofOfConcept || '',
            finding.affectedAssets?.join(' ') || '',
        ];

        return parts.join(' ');
    }

    /**
     * Clean up extracted component names
     */
    private static cleanComponentName(raw: string, type: ComponentType): string {
        let cleaned = raw.trim();

        if (type === 'endpoint') {
            // 1. Remove HTTP methods prefix (case insensitive)
            cleaned = cleaned.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '');

            // 2. Remove protocol and domain
            cleaned = cleaned.replace(/^https?:\/\/[\w\.-]+/, '');

            // 3. Remove query parameters
            cleaned = cleaned.split('?')[0];

            // 4. Normalize slashes (remove trailing slash unless it's just /)
            cleaned = cleaned.replace(/\/+/g, '/');
            if (cleaned.length > 1 && cleaned.endsWith('/')) {
                cleaned = cleaned.slice(0, -1);
            }

            // 5. Parameterize IDs (UUIDs, numeric IDs > 3 digits, or mixed alphanumeric long strings)
            // Replace UUIDs
            cleaned = cleaned.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id');

            // Replace numeric IDs (3+ digits to avoid replacing versions like v1)
            cleaned = cleaned.replace(/\/\d{3,}/g, '/:id');

            // Replace generic mixed IDs (long alphanumeric strings at end of path)
            // e.g. /api/users/12345abcde -> /api/users/:id
            if (/\/[a-zA-Z0-9]+$/.test(cleaned)) {
                const parts = cleaned.split('/');
                const lastPart = parts[parts.length - 1];
                // Heuristic: if last part is mixed alpha-numeric or just numbers, is likely ID
                // But avoid "search", "login", etc.
                const commonActions = ['login', 'logout', 'search', 'register', 'status', 'health', 'metrics', 'profile'];
                if (lastPart.length > 20 || // Very long string
                    (!commonActions.includes(lastPart.toLowerCase()) && /\d/.test(lastPart))) { // Contains number and not a common word
                    cleaned = cleaned.replace(/\/[^\/]+$/, '/:id');
                }
            }

        } else if (type === 'database') {
            // Extract just the table name from SQL
            const match = cleaned.match(/(?:FROM|UPDATE|INSERT INTO|DROP TABLE)\s+(\w+)/i);
            if (match) cleaned = match[1];
        }

        return cleaned;
    }

    /**
     * Check if component name is too generic to be useful
     */
    private static isTooGeneric(name: string): boolean {
        const genericPatterns = [
            /^\/$/,           // Just root
            /^index$/i,       // index.html
            /^test$/i,        // test
            /^data$/i,        // data
            /^\.jpg$/i,       // Just extension
        ];

        return genericPatterns.some(pattern => pattern.test(name));
    }

    /**
     * Get context snippet around match
     */
    private static getContext(text: string, position: number): string {
        const contextLength = 60;
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + contextLength);

        let snippet = text.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
    }

    /**
     * Infer trust zone from component name and type
     */
    static inferTrustZone(name: string, type: ComponentType): TrustZone {
        const nameLower = name.toLowerCase();

        // Admin patterns
        if (nameLower.includes('admin') || nameLower.includes('/admin/')) {
            return 'admin';
        }

        // Database always database zone
        if (type === 'database') {
            return 'database';
        }

        // Public API patterns
        if (nameLower.includes('/api/public') || nameLower.includes('/public/')) {
            return 'public';
        }

        // Authentication required patterns
        if (nameLower.includes('/auth/') || nameLower.includes('login') || nameLower.includes('user')) {
            return 'authenticated';
        }

        // Internal service patterns
        if (type === 'service' || nameLower.includes('internal')) {
            return 'internal';
        }

        // Default: unknown
        return 'unknown';
    }

    /**
     * Remove duplicate components (same name + type)
     */
    private static deduplicateComponents(components: ExtractedComponent[]): ExtractedComponent[] {
        const seen = new Map<string, ExtractedComponent>();

        for (const comp of components) {
            const key = `${comp.type}:${comp.name}`;
            const existing = seen.get(key);

            // Keep the one with higher confidence or better context
            if (!existing || existing.confidence < comp.confidence) {
                seen.set(key, comp);
            }
        }

        return Array.from(seen.values());
    }
}

/**
 * NER-based Component Extraction (Future Enhancement)
 * 
 * This would use Named Entity Recognition to extract components
 * more intelligently than pattern matching alone.
 */
export class NERExtractor {
    /**
     * Extract entities using NER
     * TODO: Integrate with NLP service (spaCy, Hugging Face, etc.)
     */
    static async extractEntities(text: string): Promise<ExtractedComponent[]> {
        // Stub implementation - would call NLP API
        console.warn('NER extraction not yet implemented');
        return [];
    }

    /**
     * Combine pattern and NER results
     */
    static async extractWithNER(finding: Finding): Promise<ExtractedComponent[]> {
        const patternResults = ComponentExtractor.extractFromFinding(finding);
        const nerResults = await this.extractEntities(
            `${finding.title} ${finding.description}`
        );

        // Merge results, preferring NER when available
        return [...patternResults, ...nerResults];
    }
}
