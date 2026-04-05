'use server';

import Groq from 'groq-sdk';
import { Finding, Artifact } from '@/lib/types';
import { ScopedRetrievalService } from '@/lib/knowledge-service';
import { AISuggestion, SourceCitation } from '@/lib/ai-assistance';
import { getCompletion, getAvailableProviders, type AIProvider } from '@/lib/ai-provider';

// Initialize Groq client (kept for legacy non-wizard actions)
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

/**
 * Server Action: Check which AI providers are available
 */
export async function checkAvailableProvidersAction() {
    return getAvailableProviders();
}

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
 * Secure Proxy for Groq Chat Completion (legacy — used by non-wizard actions)
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

export type RefineAction = 'refine' | 'rewrite' | 'shorten' | 'expand';

export interface ContextMetadata {
    clientId?: string;
    engagementId?: string;
    applicationId?: string;
}

export interface RefineResult {
    output: string;
    contextUsed: string[];
}

export async function refineTextAction(
    text: string,
    action: RefineAction,
    context?: string,
    metadata?: ContextMetadata
): Promise<RefineResult | string> {
    const prompts: Record<RefineAction, string> = {
        refine: "Improve clarity, flow, and professionalism. Fix grammar/spelling errors.",
        rewrite: "Rephrase this text using different words/structure while keeping the same meaning.",
        shorten: "Condense this text to be more concise. Remove fluff.",
        expand: "Expand on this text with more detail and explanation where appropriate.",
    };

    let fullContext = context || 'None';
    const contextSources: string[] = [];

    if (metadata?.engagementId && metadata?.clientId && metadata?.applicationId && text.length > 20) {
        try {
            const retrieval = ScopedRetrievalService.retrieveForEngagementWithArtifacts(
                metadata.engagementId,
                metadata.applicationId,
                metadata.clientId,
                text.substring(0, 100),
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

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE WIZARD — Multi-turn Agentic Template Generator (Groq + Gemini)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The expanded system prompt that teaches the AI about ALL available sections,
 * branding options, visual styles, findings presentation, and content control.
 */
const TEMPLATE_WIZARD_SYSTEM_PROMPT = `You are an expert Penetration Testing Report Template Architect for a platform called OkNexus.
Your job is to help security engineers design the perfect report template via a friendly, professional conversation.

═══ CONVERSATION RULES ═══
- Ask 1-2 focused questions per message. Never more.
- Be concise, professional, and warm.
- After 3-6 exchanges where you have enough context, generate the final template JSON.
- If the user picked a quick-start preset, you already have a solid base — ask 1-2 refinement questions, then generate.
- Always adapt the template to what the user actually told you. Never use placeholder values.

═══ INFORMATION TO COLLECT ═══
Gather these progressively (don't ask all at once):

1. **Report Type / Purpose**: Web App Pentest, Network Audit, Cloud Security Review, API Security Assessment, Compliance Audit, Red Team, Mobile App, IoT, etc.
2. **Target Audience**: C-Suite / Executive, Engineering / DevOps, Mixed / Both, Compliance / Legal, Client External Delivery
3. **Technical Verbosity**: High (deep technical detail), Medium (balanced), Low (business-focused)
4. **Business Language Level**: High (heavy business framing), Medium (balanced), Low (minimal business context)
5. **Sections to Include**: Pick from the STANDARD SECTIONS catalog below, plus any custom sections
6. **Visual Branding**: Colors (offer quick palettes or custom hex), font preference, logo placement
7. **Compliance Flags**: CVSS scores, CWE IDs, OWASP categories — which to include
8. **Findings Presentation** (optional advanced): Layout style, grouping, severity ordering
9. **Content Control** (optional advanced): Executive summary depth, verbosity, remediation steps

═══ STANDARD SECTIONS CATALOG ═══
These are the EXACT section IDs the system supports. Use ONLY these IDs for standard sections:

| ID | Title | Description |
|---|---|---|
| coverPage | Cover Page | Title page with branding, logos, date. Always recommended. |
| confidentialityNotice | Confidentiality Notice | Legal/NDA notice page. Recommended for client deliverables. |
| executiveSummary | Executive Summary | High-level risk overview with optional charts. Always recommended. |
| historicalComparison | Historical Comparison | Trends vs. previous engagements. Great for recurring clients. |
| teamMembers | Engagement Team | Lists the pentest team members. Optional. |
| scopeAndMethodology | Scope and Methodology | What was tested and how. Recommended for formal reports. |
| riskRatingExplanation | Risk Rating Explanation | Explains CVSS/severity rating system used. Recommended when includeCVSS is true. |
| findingsSummaryTable | Findings Summary | Summary table of all findings by severity. Recommended. |
| detailedFindings | Detailed Findings | Full vulnerability details with evidence. Always recommended. |
| recommendations | Recommendations | Prioritized remediation roadmap. Recommended. |
| conclusion | Conclusion | Wrap-up and next steps. Recommended. |

For CUSTOM sections (e.g., "API Attack Surface Analysis", "Threat Model Overview"), use:
  { "id": "custom_<snake_case_name>", "title": "Your Title", "type": "custom", "isVisible": true, "description": "What this section covers" }

═══ QUICK-START PRESETS ═══
If the user selected a preset, use it as the base and ask 1-2 refinement questions:

**Enterprise Formal**: All sections visible, High technical + High business, CVSS+CWE+OWASP, enhanced cover, charts, risk matrix, Inter font, Navy & Sky palette
**Startup Lean**: coverPage + executiveSummary + detailedFindings + recommendations, Medium technical + Low business, CVSS only, compact spacing, Slate Pro palette
**Compliance & Audit**: All sections + riskRatingExplanation prominent, High technical + High business, all compliance flags, Georgia font, formal Navy palette
**Client Deliverable**: coverPage + confidentialityNotice + executiveSummary + scopeAndMethodology + findingsSummaryTable + detailedFindings + recommendations + conclusion, Medium technical + High business, enhanced cover with logos, professional branding
**Red Team / Offensive**: coverPage + executiveSummary + scopeAndMethodology + detailedFindings + recommendations, High technical + Low business, CVSS+CWE, dark theme (Neon Dark or Midnight palette), Roboto Mono font
**Executive Summary Only**: coverPage + executiveSummary + findingsSummaryTable + conclusion, Low technical + High business, charts enabled, no CVSS/CWE, clean minimal palette

═══ QUICK PALETTES (suggest these by name) ═══
- **Navy & Sky**: #1e3a5f, #0ea5e9, #f59e0b, #16a34a, #dc2626
- **Midnight**: #0f0f1a, #7c3aed, #a855f7, #1e293b, #e2e8f0
- **Crimson Pro**: #1a1a2e, #dc2626, #ef4444, #6b7280, #f9fafb
- **Forest**: #052e16, #16a34a, #4ade80, #ca8a04, #f5f5f4
- **Neon Dark**: #0a0a0f, #39ff14, #00e5ff, #ff0090, #1a1a2e
- **Slate Pro**: #0f172a, #3b82f6, #60a5fa, #475569, #f8fafc

═══ FONT OPTIONS ═══
Suggest from: Inter (modern, recommended), Roboto (professional), Poppins (friendly), Outfit (contemporary), DM Sans (geometric), IBM Plex Sans (technical), Georgia (traditional serif), Playfair Display (elegant serif), Merriweather (readable serif), Roboto Mono (monospace/hacker), Space Grotesk (techy modern)

═══ JSON OUTPUT FORMAT ═══
When you have enough context, generate the template JSON wrapped in markers:

___TEMPLATE_JSON_START___
{
  "name": "Template Name",
  "description": "One-line description of when to use this template",
  "aiGenerated": true,
  "strictnessLevel": "standard" | "flexible",
  "technicalVerbosity": "High" | "Medium" | "Low",
  "businessLanguageLevel": "High" | "Medium" | "Low",
  "includeCVSS": true/false,
  "includeCWE": true/false,
  "includeOWASP": true/false,
  "branding": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "colorScheme": ["#hex", "#hex", "#hex", "#hex", "#hex"],
    "primaryFont": "Font Name",
    "secondaryFont": "Font Name",
    "brandFonts": ["Font Name", "Font Name"],
    "logoPlacement": "cover" | "header" | "footer" | "cover-and-header",
    "useEnhancedCover": true/false,
    "showChartsInExecutiveSummary": true/false,
    "showRiskMatrix": true/false,
    "confidentialityNotice": "Optional confidentiality text...",
    "footerText": "Optional footer text...",
    "headingColor": "#hex (optional — defaults to primaryColor)",
    "borderColor": "#hex (optional — defaults to secondaryColor)",
    "tableHeaderBg": "#hex (optional — defaults to primaryColor)",
    "tableHeaderText": "#hex (optional — defaults to #FFFFFF)",
    "linkColor": "#hex (optional — defaults to accentColor)",
    "coverGraphicPosition": "top" | "center" | "bottom" | "background" (optional)
  },
  "visualStyle": {
    "fontFamily": "inter" | "roboto" | "opensans" | "system",
    "spacingDensity": "comfortable" | "compact",
    "pageSize": "A4" | "Letter",
    "showPageNumbers": true/false,
    "showHeaderFooter": true/false,
    "headingScale": "comfortable" | "compact" | "spacious"
  },
  "contentControl": {
    "executiveSummaryDepth": "high-level" | "detailed",
    "overallVerbosity": "concise" | "standard" | "detailed",
    "includeRemediationSteps": true/false,
    "customBlocksAllowed": true/false
  },
  "findingsPresentation": {
    "layout": "table" | "narrative" | "hybrid",
    "severityOrdering": "critical-first" | "by-asset" | "by-category",
    "groupBy": "severity" | "asset" | "category" | "none",
    "includeCharts": true/false,
    "includeGraphs": true/false
  },
  "sections": [
    { "id": "coverPage", "title": "Cover Page", "type": "standard", "isVisible": true },
    { "id": "executiveSummary", "title": "Executive Summary", "type": "standard", "isVisible": true },
    ...
  ]
}
___TEMPLATE_JSON_END___

═══ CRITICAL RULES ═══
- Section IDs MUST match exactly from the STANDARD SECTIONS CATALOG above
- Minimum required sections: coverPage, executiveSummary, detailedFindings
- Custom sections use type: "custom" and have a "description" field
- The "findingsPresentation" and "contentControl" objects are optional but add value for power users
- Always set "aiGenerated": true
- Adapt EVERYTHING based on user responses — never use generic defaults`;

/**
 * Agentic Template Wizard — Multi-turn chat with provider selection
 *
 * Now supports both Groq and Gemini backends via the AI provider abstraction.
 * The client passes the preferred provider; falls back to whatever is available.
 */
export async function chatTemplateWizardAction(
    messages: { role: 'user' | 'assistant'; content: string }[],
    preferredProvider: AIProvider = 'groq'
): Promise<{ reply: string; done: boolean; templateJson?: object; provider: AIProvider }> {

    // Check if preferred provider is available, fall back to the other
    const providers = await getAvailableProviders();
    const preferred = providers.find(p => p.provider === preferredProvider);
    const fallback = providers.find(p => p.provider !== preferredProvider && p.available);

    let activeProvider: AIProvider;
    if (preferred?.available) {
        activeProvider = preferredProvider;
    } else if (fallback) {
        activeProvider = fallback.provider;
    } else {
        return {
            reply: "No AI provider is configured. Please add GROQ_API_KEY or GEMINI_API_KEY to your .env.local file, then restart the server.",
            done: false,
            provider: preferredProvider,
        };
    }

    try {
        const result = await getCompletion(activeProvider, {
            messages: [
                { role: 'system', content: TEMPLATE_WIZARD_SYSTEM_PROMPT },
                ...messages.map(m => ({ ...m, role: m.role as 'user' | 'assistant' })),
            ],
            temperature: 0.5,
            maxTokens: activeProvider === 'gemini' ? 4000 : 2000,
        });

        const reply = result.content;

        // Detect if the AI has embedded a final JSON payload
        const jsonMatch = reply.match(/___TEMPLATE_JSON_START___([\s\S]*?)___TEMPLATE_JSON_END___/);
        if (jsonMatch) {
            try {
                const templateJson = JSON.parse(jsonMatch[1].trim());
                return { reply, done: true, templateJson, provider: activeProvider };
            } catch {
                return {
                    reply: reply + '\n\nThere was a parsing error in the generated template. Let me try again — could you re-confirm your preferences?',
                    done: false,
                    provider: activeProvider,
                };
            }
        }

        return { reply, done: false, provider: activeProvider };
    } catch (error: any) {
        console.error(`[chatTemplateWizardAction] ${activeProvider} error:`, error);

        // If the preferred provider failed, try fallback
        if (activeProvider === preferredProvider && fallback) {
            try {
                const result = await getCompletion(fallback.provider, {
                    messages: [
                        { role: 'system', content: TEMPLATE_WIZARD_SYSTEM_PROMPT },
                        ...messages.map(m => ({ ...m, role: m.role as 'user' | 'assistant' })),
                    ],
                    temperature: 0.5,
                });

                const reply = result.content;
                const jsonMatch = reply.match(/___TEMPLATE_JSON_START___([\s\S]*?)___TEMPLATE_JSON_END___/);
                if (jsonMatch) {
                    try {
                        const templateJson = JSON.parse(jsonMatch[1].trim());
                        return { reply, done: true, templateJson, provider: fallback.provider };
                    } catch {
                        return { reply, done: false, provider: fallback.provider };
                    }
                }
                return { reply, done: false, provider: fallback.provider };
            } catch (fallbackError) {
                console.error(`[chatTemplateWizardAction] Fallback ${fallback.provider} also failed:`, fallbackError);
            }
        }

        return {
            reply: 'The AI service encountered an error. Please try again in a moment.',
            done: false,
            provider: activeProvider,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVER GRAPHIC GENERATION — Imagen 4 Fast (25 RPD free tier)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cover graphic using AI-generated SVG.
 * Uses Gemini 2.5 Flash (text model) to produce SVG code, then encodes as a data URL.
 * This works on the free tier since it only needs text generation.
 */
export async function generateCoverGraphicAction(
    prompt: string
): Promise<{ imageUrl: string | null; error?: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!apiKey && !groqKey) {
        return { imageUrl: null, error: 'No AI provider configured. Add GEMINI_API_KEY or GROQ_API_KEY to .env.local.' };
    }

    const svgSystemPrompt = `You are an SVG graphic designer. Output ONLY raw SVG code. No markdown, no explanation, no code fences.

CRITICAL RULES:
- Start with <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"> and MUST end with </svg>
- KEEP IT COMPACT — under 3000 characters total. This is the most important rule.
- Use simple rect, circle, ellipse, polygon, line elements — avoid complex paths
- Use 2-3 linearGradient or radialGradient definitions max
- NO text elements, NO <text> tags
- NO comments in the SVG
- Use elegant color palettes (deep blues, teals, purples for cyber themes)
- Create an abstract, professional, modern design
- Think: overlapping geometric shapes with gradient fills and subtle opacity`;

    const userPrompt = `Compact SVG cover graphic for: ${prompt}. Use simple geometric shapes (circles, rects, polygons) with gradients. Keep it minimal and elegant — under 3000 characters.`;

    try {
        // Prefer Gemini (higher token limit), fall back to Groq
        const provider = apiKey ? 'gemini' : 'groq';

        const result = await getCompletion(provider as AIProvider, {
            messages: [
                { role: 'system', content: svgSystemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            maxTokens: 8000,
        });

        // Extract SVG from response (strip any accidental markdown wrapping)
        let svg = result.content.trim();

        // Remove code fences if present
        svg = svg.replace(/^```(?:svg|xml)?\n?/i, '').replace(/\n?```$/i, '').trim();

        // Extract just the SVG tag if there's extra text around it
        const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/i);
        if (!svgMatch) {
            console.error('[generateCoverGraphic] No SVG found in output:', svg.slice(0, 200));
            return { imageUrl: null, error: 'AI generated invalid graphic. Try again with a different description.' };
        }
        svg = svgMatch[0];

        // Encode SVG as data URL
        const encoded = Buffer.from(svg, 'utf-8').toString('base64');
        const dataUrl = `data:image/svg+xml;base64,${encoded}`;

        console.log(`[generateCoverGraphic] SVG generated via ${result.provider} (${svg.length} bytes)`);
        return { imageUrl: dataUrl };
    } catch (error: any) {
        console.error('[generateCoverGraphic] Error:', error.message);
        return { imageUrl: null, error: `Failed to generate graphic: ${error.message}` };
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
