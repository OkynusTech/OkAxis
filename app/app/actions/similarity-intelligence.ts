'use server';

import { getGroqCompletion } from './ai-actions';
import { Finding } from '@/lib/types';

/**
 * AI Similarity Result
 */
// DEEP REASONING SIMILARITY TYPES
export type SimilarityClass = 'PRIMARY' | 'SECONDARY' | 'WEAK' | 'NONE';

export interface MeaningfulContext {
    isRelevant: boolean;
    similarityClass: SimilarityClass;
    contextReasoning: string; // Internal reasoning summary
    reasoningDimensions: {
        rootCause: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
        controlLayer: 'MATCH' | 'MISMATCH';
        trustBoundary: 'MATCH' | 'MISMATCH';
        threatModel: 'SIMILAR' | 'DIFFERENT';
        remediation: 'SYSTEMIC' | 'DIFFERENT';
    };
    userFacingContext: {
        relevanceRating: 'HIGH' | 'MEDIUM' | 'LOW'; // Explicit rating for user
        contextForSurfacing: string; // One neutral sentence
        relatedItems: Array<{
            title: string;
            engagementDate: string;
            factualDescriptor: string; // One factual line
        }>;
        interpretationNote: string; // Factual disclaimer
    };
    metaPattern?: string; // Optional cross-engagement pattern detected
}

export interface ArtifactContext {
    artifactId: string;
    artifactName: string;
    artifactType: string;
    excerpt: string;
    relevanceScore: number;
    scopeLevel: 'client' | 'application' | 'engagement';
}

export interface EnhancedMeaningfulContext extends MeaningfulContext {
    artifactEvidence?: ArtifactContext[];
}

/**
 * Server Action: Analyze similarity between two findings using AI reasoning
 */
export async function analyzeFindingSimilarity(
    sourceFinding: Partial<Finding>,
    candidateFinding: Partial<Finding>,
    artifactContext?: ArtifactContext[]
): Promise<MeaningfulContext> {
    // Build artifact context section if provided
    const artifactSection = artifactContext && artifactContext.length > 0 ? `

ARTIFACT CONTEXT (Historical Documentation):
${artifactContext.map(artifact => `
  [${artifact.artifactType}] ${artifact.artifactName} (${artifact.scopeLevel})
  ${artifact.excerpt}
  Relevance: ${(artifact.relevanceScore * 100).toFixed(0)}%
  ---
`).join('\n')}

CONSIDER ARTIFACTS FOR:
- Recurring patterns documented in past reports
- Policy violations or compliance gaps  
- Similar architectural flaws from diagrams
- Test results from previous engagements

Weigh artifact evidence when evaluating root cause and systemic risk.
` : '';

    const prompt = `You are a historical context engine. Your job is to surface relevant memory to aid a human engineer, NOT to make decisions.

CURRENT FINDING:
Title: "${sourceFinding.title}"
Description: ${sourceFinding.description || 'Not provided'}
Affected: ${sourceFinding.affectedAssets?.join(', ') || 'Not specified'}

HISTORICAL ITEM:
Title: "${candidateFinding.title}"
Description: ${candidateFinding.description || 'Not provided'}
Discovery Date: ${candidateFinding.discoveryDate || 'Unknown'}
Affected: ${candidateFinding.affectedAssets?.join(', ') || 'Not specified'}
${artifactSection}
---
MANDATORY REASONING DIMENSIONS (Evaluate Internally):
1. Root Cause: Is the underlying failure mechanism identical? (e.g. Broken Authentication vs Input Validation)
2. Control Layer: Is it the same security control? (e.g. Session Mgmt vs Error Handling)
3. Trust Boundary: Is the same trust boundary violated? (e.g. Public API vs Internal Admin)
4. Threat Model: Is the attacker capability/outcome similar?
5. Remediation: Would one systemic fix address both?

CLASSIFICATION RULES:
- PRIMARY SIMILARITY: Same Root Cause + Same Control Layer + Same Trust Boundary. (Systemic Risk)
- SECONDARY SIMILARITY: Same Security Domain but different controls/threats. (Thematic Weakness)
- WEAK SIMILARITY: Same application surface only.
- NO SIMILARITY: Different layers, different attacker value. (SUPPRESS)

---
OUTPUT REQUIREMENTS:
If similarity is PRIMARY or SECONDARY, generate a JSON response.
If WEAK or NONE, set isRelevant: false.

Language Constraints:
- Neutral, factual tone only.
- NO: "Likely", "Matches", "AI thinks", "You should".
- YES: "Previously observed", "For context", "Related to".

RETURN ONLY THIS JSON:
{
    "isRelevant": boolean,
    "similarityClass": "PRIMARY" | "SECONDARY" | "WEAK" | "NONE",
    "contextReasoning": "Internal summary of the 5 dimensions",
    "userFacingContext": {
        "contextForSurfacing: "One neutral sentence explaining the relevance (e.g. 'This finding touches an authorization boundary similar to areas previously examined.')",
        "relatedItems": [
            {
                "title": "Title of the historical item",
                "engagementDate": "Engagement Date/Name",
                "factualDescriptor": "One factual line about what it examined (e.g. 'Service accounts had access beyond scope')"
            }
        ],
        "interpretationNote": "These items are shown for historical context and do not imply the presence of a vulnerability."
    },
    "metaPattern": "Optional: If this indicates a pattern (e.g. 'Recurring auth gaps across endpoints'), state it neutrally. Otherwise, null."
}`;

    try {
        const responseText = await getGroqCompletion(
            prompt,
            "You are a neutral historical memory engine. Return ONLY valid JSON."
        );

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        return JSON.parse(jsonMatch[0]) as MeaningfulContext;
    } catch (error) {
        console.error('Context Analysis Error:', error);
        return {
            isRelevant: false,
            similarityClass: 'NONE',
            contextReasoning: 'Analysis failed',
            reasoningDimensions: {
                rootCause: 'UNCERTAIN',
                controlLayer: 'MISMATCH',
                trustBoundary: 'MISMATCH',
                threatModel: 'DIFFERENT',
                remediation: 'DIFFERENT'
            },
            userFacingContext: {
                relevanceRating: 'LOW',
                contextForSurfacing: '',
                relatedItems: [],
                interpretationNote: ''
            }
        };
    }
}
