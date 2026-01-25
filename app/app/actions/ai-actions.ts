'use server';

import Groq from 'groq-sdk';
import { Finding, Artifact } from '@/lib/types';
import { ScopedRetrievalService } from '@/lib/knowledge-service';
import { AISuggestion, SourceCitation } from '@/lib/ai-assistance';

// Initialize Groq client with server-side environment variable
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

/**
 * Server Action: Draft vulnerability description using Groq AI
 */
export async function draftDescriptionAction(
    finding: Finding,
    engagementId: string,
    applicationId: string,
    clientId: string
): Promise<AISuggestion> {
    if (!groq) {
        return {
            content: `[AI is not configured]\n\nAdd your GROQ_API_KEY to .env.local on the server to enable AI-powered suggestions.`,
            isAIGenerated: true,
            sources: [],
            confidence: 'low',
            explanation: 'Groq API key is missing in server environment.',
        };
    }

    // Return placeholder as per previous logic (state issue workaround)
    return {
        content: "[Redirecting to secure agent proxy...]",
        isAIGenerated: true,
        sources: [],
        confidence: 'low',
        explanation: 'AI logic shifted to server proxy.',
    };
}

/**
 * Secure Proxy for Groq Chat Completion
 */
export async function getGroqCompletion(prompt: string, systemPrompt: string = "You are a security expert.") {
    if (!groq) {
        throw new Error('GROQ_API_KEY is not configured on the server.');
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 800,
        });

        return chatCompletion.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Groq Server Action Error:', error);
        throw error;
    }
}

// ... (imports)

export type RefineAction = 'refine' | 'rewrite' | 'shorten' | 'expand';

export interface ContextMetadata {
    clientId?: string;
    engagementId?: string;
    applicationId?: string;
}

export interface RefineResult {
    output: string;
    contextUsed: string[]; // List of source names/titles
}

export async function refineTextAction(
    text: string,
    action: RefineAction,
    context?: string,
    metadata?: ContextMetadata
): Promise<RefineResult | string> { // Type union for backward compat momentarily, but we will return object
    const prompts: Record<RefineAction, string> = {
        refine: "Improve clarity, flow, and professionalism. Fix grammar/spelling errors.",
        rewrite: "Rephrase this text using different words/structure while keeping the same meaning.",
        shorten: "Condense this text to be more concise. Remove fluff.",
        expand: "Expand on this text with more detail and explanation where appropriate.",
    };

    let fullContext = context || 'None';
    const contextSources: string[] = [];

    // RAG Enrichment if metadata is available
    if (metadata?.engagementId && metadata?.clientId && metadata?.applicationId && text.length > 20) {
        // Only try retrieval if we have IDs and enough text to form a query, ensuring robust context.
        try {
            const retrieval = ScopedRetrievalService.retrieveForEngagementWithArtifacts(
                metadata.engagementId,
                metadata.applicationId,
                metadata.clientId,
                text.substring(0, 100), // Use start of text as query 
                { maxResults: 3, includeContent: false }
            );

            if (retrieval.artifactExcerpts.length > 0) {
                const artifactsContext = retrieval.artifactExcerpts
                    .map(a => {
                        contextSources.push(`Artifact: ${a.artifactName}`);
                        return `[Artifact: ${a.artifactName}]: ${a.excerpt}`;
                    })
                    .join('\n\n');

                fullContext += `\n\n=== RELEVANT PROJECT CONTEXT ===\n${artifactsContext}`;
            }
        } catch (err) {
            console.error('Context retrieval failed:', err);
            // Fallback to basic context if retrieval fails
        }
    }

    const prompt = `You are a professional editor.
Task: ${prompts[action]}

Context (if any): ${fullContext}

Input Text:
"${text}"

Instructions:
- Return ONLY the refined text.
- Do not add quotes around the output unless they were in the input.
- Do not add conversational filler (e.g. "Here is the refined text").
- Maintain the original markdown formatting if present.`;

    if (!groq) {
        return { output: "[Error] API Key not configured. Please add GROQ_API_KEY to .env", contextUsed: [] };
    }

    try {
        const result = await getGroqCompletion(prompt, "You are a professional editor. Output only valid refined text.");
        return { output: result, contextUsed: contextSources };
    } catch (error) {
        console.error("AI Action Error:", error);
        return { output: "[Error] AI service is currently unavailable.", contextUsed: [] };
    }
}

/**
 * Generate Client Executive Summary
 */
export async function generateClientSummaryAction(clientId: string, clientName: string, findingsContext: any[]): Promise<string> {
    if (!groq) return "AI Configuration Missing.";

    const criticalCount = findingsContext.filter(f => f.severity === 'Critical').length;
    const highCount = findingsContext.filter(f => f.severity === 'High').length;

    // Construct a focused context limit to avoid token limits
    const topRisks = findingsContext
        .filter(f => ['Critical', 'High'].includes(f.severity))
        .slice(0, 5)
        .map(f => `- [${f.severity}] ${f.title}: ${f.description.substring(0, 100)}...`)
        .join('\n');

    const prompt = `You are a CISO preparing a brief executive summary for ${clientName}.
    
    Current Risk Posture:
    - Critical Issues: ${criticalCount}
    - High Issues: ${highCount}
    
    Top Risks Identified:
    ${topRisks}

    Task:
    Write a 3-4 sentence business-focused summary of their current security posture. 
    Focus on the business impact of the top risks and the urgency of remediation. 
    Do not be technical. Be professional, direct, and concise.`;

    try {
        const result = await getGroqCompletion(prompt, "You are a CISO. Write strictly for executive business stakeholders.");
        return result;
    } catch (error) {
        console.error("Summary Generation Error:", error);
        return "Unable to generate summary at this time.";
    }
}

/**
 * Explain Finding (Contextual Help)
 */
export async function explainFindingAction(finding: any, queryType: 'business' | 'fix' | 'custom', customQuery?: string): Promise<string> {
    if (!groq) return "AI Configuration Missing.";

    const context = `
    Finding: ${finding.title}
    Severity: ${finding.severity}
    Description: ${finding.description}
    Impact: ${finding.impact}
    Remediation: ${finding.remediation}
    `;

    let systemPrompt = "You are a helpful security assistant explaining technical issues to a business client.";
    let userPrompt = "";

    if (queryType === 'business') {
        userPrompt = `Explain the business risk of this finding in simple, non-technical language. Focus on what could go wrong if not fixed.
        
        ${context}
        `;
    } else if (queryType === 'fix') {
        systemPrompt = "You are a security engineer providing high-level guidance.";
        userPrompt = `Explain the steps to fix this vulnerability in simple terms for a project manager to understand.
        
        ${context}
        `;
    } else {
        userPrompt = `Context: ${context}
        
        Question: ${customQuery}
        
        Answer concisely and helpfully.`;
    }

    try {
        const result = await getGroqCompletion(userPrompt, systemPrompt);
        return result;
    } catch (error) {
        console.error("Explanation Error:", error);
        return "Unable to provide explanation at this time.";
    }
}
