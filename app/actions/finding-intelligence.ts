'use server';

import { getGroqCompletion } from './ai-actions';
import { Finding } from '@/lib/types';

/**
 * AI Finding Intelligence Result
 */
export interface IntelligenceResult {
    tags: string[];
    predictedSeverity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    owaspMapping: string;
    cweMapping: string;
    riskContext: string;
    confidence: number;
}

/**
 * Server Action: Analyze finding using AI to provide tags, severity prediction, and risk context
 */
export async function analyzeFindingIntelligence(
    finding: Partial<Finding>,
    clientIndustry?: string,
    clientTechStack?: string
): Promise<IntelligenceResult> {
    const prompt = `You are a Senior Security Analyst. Analyze the following finding with 100% technical accuracy.

Finding Title: ${finding.title || 'Untitled'}
Finding Description: ${finding.description || 'No description provided'}

Client Context:
- Industry: ${clientIndustry || 'General Software'}
- Tech Stack: ${clientTechStack || 'Unknown'}

---
STEP 1: REASONING (Chain of Thought)
Analyze the vulnerability. Identify the attack vector, the data flow, and why it fits a specific category. 
- Is it XSS? If so, is it Reflected (A03:2021) or Stored (A03:2021)? 
- Is it an Auth issue (A07:2021)?
- Is it a Config issue (A05:2021)?

STEP 2: CLASSIFICATION RULES
1. OWASP MUST be one of:
   - A01:2021-Broken Access Control
   - A02:2021-Cryptographic Failures
   - A03:2021-Injection (Includes XSS, SQLi, etc.)
   - A04:2021-Insecure Design
   - A05:2021-Security Misconfiguration
   - A06:2021-Vulnerable and Outdated Components
   - A07:2021-Identification and Authentication Failures
   - A08:2021-Software and Data Integrity Failures
   - A09:2021-Security Logging and Monitoring Failures
   - A10:2021-Server-Side Request Forgery (SSRF)

2. CWE MUST be a valid ID (e.g., CWE-79 for XSS, CWE-89 for SQLi).

---
Return ONLY a JSON object with this structure:
{
    "thought": "Your 1-2 sentence logical reasoning for this classification",
    "tags": ["tag1", "tag2"],
    "predictedSeverity": "Critical|High|Medium|Low|Informational",
    "owaspMapping": "Selected category from the list above",
    "cweMapping": "Specific CWE ID",
    "riskContext": "Explanation of impact for this specific client stack",
    "confidence": 0.0 to 1.0
}

Final Rule: If it is Stored XSS, it MUST be A03:2021-Injection and CWE-79. Never map XSS to A07.`;

    try {
        const responseText = await getGroqCompletion(
            prompt,
            "You are a security intelligence analyst. Return ONLY valid JSON."
        );

        // Extract JSON from response (handling potential markdown blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const result = JSON.parse(jsonMatch[0]) as IntelligenceResult;
        return result;
    } catch (error) {
        console.error('Finding Intelligence Error:', error);
        return {
            tags: [],
            predictedSeverity: (finding.severity as any) || 'Medium',
            owaspMapping: 'A00:2021-Unknown',
            cweMapping: 'CWE-Unknown',
            riskContext: 'Error analyzing risk context.',
            confidence: 0,
        };
    }
}
