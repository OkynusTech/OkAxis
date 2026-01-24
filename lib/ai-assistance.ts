/**
 * AI Assistance Service - Powered by Groq
 * 
 * Provides guarded, explainable AI assistance for finding drafting.
 * 
 * CRITICAL GUARDRAILS:
 * - Use only retrieved context (via knowledge service)
 * - Cite internal sources
 * - Return suggestions as drafts with "AI-generated" labels
 * - Never auto-submit findings
 * - Never infer vulnerabilities independently
 * 
 * All suggestions are fully editable by the user.
 */

import { Finding, Artifact } from './types';
import { ScopedRetrievalService, RetrievalResult } from './knowledge-service';
import { getGroqCompletion } from '@/app/actions/ai-actions';
import { analyzeFindingIntelligence, IntelligenceResult } from '@/app/actions/finding-intelligence';
import { analyzeFindingSimilarity, MeaningfulContext } from '@/app/actions/similarity-intelligence';

// Initialize Groq client
// No longer initializing Groq client here - moved to server action
const groq = null;

// ============================================================================
// Types
// ============================================================================

export interface AISuggestion {
    content: string;
    isAIGenerated: true;
    sources: SourceCitation[];
    confidence: 'low' | 'medium' | 'high';
    explanation: string;
}

export interface SourceCitation {
    artifactId: string;
    artifactName: string;
    artifactType: string;
    excerpt?: string;
}

// ============================================================================
// AI Assistant (Groq-Powered)
// ============================================================================

export class AIAssistant {
    /**
     * Draft vulnerability description based on context
     */
    static async draftDescription(
        finding: Finding,
        engagementId: string,
        applicationId: string,
        clientId: string
    ): Promise<AISuggestion> {
        // Retrieve relevant context
        const context = ScopedRetrievalService.retrieveForEngagement(
            engagementId,
            applicationId,
            clientId,
            finding.title, // Use title as search query
            { maxResults: 5, artifactTypes: ['architecture-document', 'walkthrough-transcript'] }
        );

        // Build suggestion using Groq
        const suggestion = await this.buildDescriptionFromGroq(finding, context);

        return {
            content: suggestion,
            isAIGenerated: true,
            sources: this.buildSourceCitations(context),
            confidence: context.artifacts.length > 2 ? 'high' : context.artifacts.length > 0 ? 'medium' : 'low',
            explanation: `Generated using Groq AI based on ${context.artifacts.length} contextual artifact${context.artifacts.length !== 1 ? 's' : ''}`,
        };
    }

    /**
     * Draft steps to reproduce
     */
    static async draftStepsToReproduce(
        finding: Finding,
        engagementId: string,
        applicationId: string,
        clientId: string
    ): Promise<AISuggestion> {
        // Retrieve walkthrough transcripts and scope documents
        const context = ScopedRetrievalService.retrieveForEngagement(
            engagementId,
            applicationId,
            clientId,
            finding.title,
            { maxResults: 5, artifactTypes: ['walkthrough-transcript', 'scope-document'] }
        );

        const suggestion = await this.buildStepsFromGroq(finding, context);

        return {
            content: suggestion,
            isAIGenerated: true,
            sources: this.buildSourceCitations(context),
            confidence: context.artifacts.length > 0 ? 'medium' : 'low',
            explanation: `Suggested steps based on ${context.artifacts.length} contextual artifact${context.artifacts.length !== 1 ? 's' : ''}`,
        };
    }

    /**
     * Draft remediation recommendations
     */
    static async draftRemediation(
        finding: Finding,
        engagementId: string,
        applicationId: string,
        clientId: string
    ): Promise<AISuggestion> {
        // Retrieve architecture documents and previous reports
        const context = ScopedRetrievalService.retrieveForEngagement(
            engagementId,
            applicationId,
            clientId,
            `${finding.title} remediation`,
            { maxResults: 5, artifactTypes: ['architecture-document', 'previous-report'] }
        );

        const suggestion = await this.buildRemediationFromGroq(finding, context);

        return {
            content: suggestion,
            isAIGenerated: true,
            sources: this.buildSourceCitations(context),
            confidence: context.artifacts.length > 0 ? 'medium' : 'low',
            explanation: `Remediation guidance based on ${context.artifacts.length} contextual artifact${context.artifacts.length !== 1 ? 's' : ''} and industry best practices`,
        };
    }

    /**
     * Summarize recurring patterns across findings
     */
    static async summarizeRecurringPatterns(
        findings: Finding[],
        applicationId: string,
        clientId: string
    ): Promise<AISuggestion> {
        // Get application context
        const context = ScopedRetrievalService.retrieveForApplication(
            applicationId,
            clientId,
            'security patterns vulnerabilities',
            { maxResults: 10 }
        );

        // Analyze patterns
        const categoryMap = new Map<string, number>();
        findings.forEach(f => {
            const category = f.category || f.threatCategory || 'Other';
            categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        const patterns = Array.from(categoryMap.entries())
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => `${category}: ${count} findings`)
            .join('\n');

        const suggestion = patterns || 'No recurring patterns detected';

        return {
            content: suggestion,
            isAIGenerated: true,
            sources: this.buildSourceCitations(context),
            confidence: patterns ? 'high' : 'low',
            explanation: `Pattern analysis based on ${findings.length} findings`,
        };
    }

    /**
     * Analyze finding intelligence (tags, severity, context)
     */
    static async analyzeIntelligence(
        finding: Partial<Finding>,
        clientId: string
    ): Promise<IntelligenceResult> {
        // Fetch client details for context
        const { getClient } = require('./storage');
        const client = getClient(clientId);

        return await analyzeFindingIntelligence(
            finding,
            client?.industry,
            client?.techStack // Note: types.ts might need update for techStack
        );
    }

    /**
     * Analyze similarity between a finding and historical candidates using AI
     */
    static async analyzeSemanticSimilarity(
        sourceFinding: Partial<Finding>,
        candidates: Partial<Finding>[]
    ): Promise<Array<{ finding: Partial<Finding>, analysis: MeaningfulContext }>> {
        // REMOVED: Minimum dataset size check. We should always check for valid similarity.
        // Even 1 historical finding can be a valid match.
        // const MIN_DATASET_SIZE = 5; 

        const MIN_RELEVANCE_THRESHOLD = 0.6; // Only show high-confidence matches

        // No early exit - always analyze candidates
        console.log(`🔍 Checking similarity against ${candidates.length} candidates...`);

        const results: Array<{ finding: Partial<Finding>, analysis: MeaningfulContext, score: number }> = [];

        for (const candidate of candidates) {
            try {
                const analysis = await analyzeFindingSimilarity(sourceFinding, candidate);

                // Calculate confidence score based on analysis
                let score = 0;
                if (!analysis.isRelevant) {
                    score = 0;
                } else if (analysis.similarityClass === 'PRIMARY') {
                    score = analysis.userFacingContext.relevanceRating === 'HIGH' ? 1.0 : 0.8;
                } else if (analysis.similarityClass === 'SECONDARY') {
                    score = analysis.userFacingContext.relevanceRating === 'HIGH' ? 0.7 : 0.5;
                } else if (analysis.similarityClass === 'WEAK') {
                    score = 0.3; // Below threshold
                }

                if (score > 0) {
                    results.push({ finding: candidate, analysis, score });
                }
            } catch (error) {
                console.error('Error analyzing similarity for candidate:', error);
            }
        }

        // DYNAMIC THRESHOLD: Be more lenient with small datasets to always show something if possible
        const effectiveThreshold = candidates.length <= 4 ? 0.3 : MIN_RELEVANCE_THRESHOLD;

        // Filtering:
        const relevantResults = results.filter(r => r.score >= effectiveThreshold);

        // Sort by score (highest first)
        relevantResults.sort((a, b) => b.score - a.score);

        // USER REQUESTED LIMITS:
        // - Up to 4 findings: Show Top 1
        // - 5 to 7 findings: Show Top 2
        // - 8+ findings: Show Top 3

        let maxResults = 3;

        if (candidates.length <= 4) {
            // Always try to show at least 1 if we have any relevant matches
            maxResults = 1;
        } else if (candidates.length <= 7) {
            maxResults = 2;
        } else {
            maxResults = 3;
        }

        const filtered = relevantResults.slice(0, maxResults);

        console.log(`🔍 Similarity Analysis: ${candidates.length} candidates → ${relevantResults.length} relevant (threshold ${effectiveThreshold}) → ${filtered.length} shown`);

        return filtered.map(r => ({ finding: r.finding, analysis: r.analysis }));
    }

    /**
     * Explain suggestion - show which context was used
     */
    static explainSuggestion(suggestion: AISuggestion): string {
        let explanation = `${suggestion.explanation}\n\n`;

        if (suggestion.sources.length > 0) {
            explanation += 'Sources used:\n';
            suggestion.sources.forEach((source, idx) => {
                explanation += `${idx + 1}. ${source.artifactName} (${source.artifactType})\n`;
                if (source.excerpt) {
                    explanation += `   "${source.excerpt}"\n`;
                }
            });
        } else {
            explanation += 'No specific contextual artifacts were used. This suggestion is based on general security best practices.';
        }

        return explanation;
    }

    // ======================================================================
    // Private Groq-Powered Suggestion Builders
    // ======================================================================

    /**
     * Build description using Groq AI
     */
    private static async buildDescriptionFromGroq(
        finding: Finding,
        context: RetrievalResult
    ): Promise<string> {
        // Build context from artifacts
        const contextText = context.artifacts
            .map(a => `Source: ${a.name}\n${a.content?.substring(0, 800) || 'No content available'}`)
            .join('\n\n');

        const prompt = `You are a security assessment assistant. Draft a clear, technical vulnerability description.

Finding Title: ${finding.title}
Severity: ${finding.severity}
Category: ${finding.category || 'Not specified'}

Application Context:
${contextText || 'No application context available'}

Instructions:
- Write a clear, technical description of this ${finding.severity.toLowerCase()} severity vulnerability
- Use ONLY information from the application context provided above
- If context mentions specific technologies, reference them
- If context is insufficient, state what information is needed
- Keep it concise (2-3 paragraphs)
- Be specific and actionable`;

        try {
            return await getGroqCompletion(
                prompt,
                "You are a security expert. Use ONLY the provided context. Never invent information."
            );
        } catch (error) {
            console.error('Groq API error:', error);
            return `[AI Error: ${error instanceof Error ? error.message : 'Unknown error'}]\n\nPlease write the description manually.`;
        }
    }

    /**
     * Build steps to reproduce using Groq AI
     */
    private static async buildStepsFromGroq(
        finding: Finding,
        context: RetrievalResult
    ): Promise<string> {
        const contextText = context.artifacts
            .map(a => `${a.name}:\n${a.content?.substring(0, 600) || ''}`)
            .join('\n\n');

        const prompt = `Generate clear, numbered steps to reproduce this vulnerability:

Vulnerability: ${finding.title}
Severity: ${finding.severity}

Context:
${contextText || 'No walkthrough or scope information available'}

Generate 4-8 specific steps that a security tester could follow to reproduce this issue. If context provides UI flows or endpoints, reference them. Format as a numbered list.`;

        try {
            return await getGroqCompletion(
                prompt,
                "You are a security tester. Create clear, actionable reproduction steps."
            );
        } catch (error) {
            console.error('Groq error:', error);
            return `[Error: ${error instanceof Error ? error.message : 'Unknown'}]`;
        }
    }

    /**
     * Build remediation using Groq AI
     */
    private static async buildRemediationFromGroq(
        finding: Finding,
        context: RetrievalResult
    ): Promise<string> {
        const contextText = context.artifacts
            .map(a => `${a.name}:\n${a.content?.substring(0, 600) || ''}`)
            .join('\n\n');

        const prompt = `Provide remediation guidance for this vulnerability:

Vulnerability: ${finding.title}
Severity: ${finding.severity}
Category: ${finding.category || 'Not specified'}

Application Architecture:
${contextText || 'No architecture information available'}

Provide:
1. Short-term fixes (immediate mitigation)
2. Long-term recommendations (architectural improvements)
3. If context mentions specific tech stack, tailor suggestions to it
4. Be specific and actionable`;

        try {
            return await getGroqCompletion(
                prompt,
                "You are a security architect providing remediation guidance."
            );
        } catch (error) {
            console.error('Groq error:', error);
            return `[Error: ${error instanceof Error ? error.message : 'Unknown'}]`;
        }
    }

    /**
     * Build source citations from retrieval results
     */
    private static buildSourceCitations(context: RetrievalResult): SourceCitation[] {
        return context.provenance.map(p => ({
            artifactId: p.artifactId,
            artifactName: p.artifactName,
            artifactType: p.artifactType,
            excerpt: p.matchedContent,
        }));
    }
}

// ============================================================================
// LLM Provider Interface (for future integration)
// ============================================================================

/**
 * Interface for LLM providers
 * Implement this for OpenAI, Anthropic, Google Gemini, etc.
 */
export interface LLMProvider {
    generateCompletion(prompt: string, context: string[]): Promise<string>;
    name: string;
}

/**
 * Stub LLM provider for template-based suggestions
 */
export class TemplateLLMProvider implements LLMProvider {
    name = 'Template-Based (Stub)';

    async generateCompletion(prompt: string, context: string[]): Promise<string> {
        // Stub: return template-based response
        return `[Template-based response]\n${prompt}\n\nContext provided: ${context.length} items`;
    }
}
