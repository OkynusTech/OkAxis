/**
 * Remediation Intelligence Service
 * 
 * Provides AI-powered remediation suggestions based on historical patterns,
 * success rates, and contextual analysis. Warns engineers about failed approaches
 * and surfaces successful strategies from similar cases.
 */

import { Finding, RemediationEvent, RemediationSuggestion, RemediationType, RemediationOutcome } from './types';
import { getClientRemediationEvents, getRemediationEventsByOutcome } from './storage';
import { getGroqCompletion } from '@/app/actions/ai-actions';

/**
 * Analyze historical remediation patterns for similar findings
 */
export function analyzeRemediationPatterns(
    finding: Finding,
    clientId: string
): {
    successfulApproaches: Array<{ type: RemediationType; count: number; avgEffort?: string }>;
    failedApproaches: Array<{ type: RemediationType; count: number; commonReason?: string }>;
    totalAttempts: number;
} {
    const allEvents = getClientRemediationEvents(clientId);

    // Filter to similar findings (same category/severity/type)
    const similarEvents = allEvents.filter(event => {
        // Get the finding for this event (simplified - would need better lookup)
        // For now, filter by finding characteristics we can infer
        return true; // Placeholder - would implement similarity logic
    });

    const successfulApproaches: Map<RemediationType, { count: number; efforts: string[] }> = new Map();
    const failedApproaches: Map<RemediationType, { count: number; reasons: string[] }> = new Map();

    similarEvents.forEach(event => {
        if (event.outcome === 'successful') {
            const existing = successfulApproaches.get(event.type) || { count: 0, efforts: [] };
            existing.count++;
            if (event.actualEffort) existing.efforts.push(event.actualEffort);
            successfulApproaches.set(event.type, existing);
        } else if (event.outcome === 'failed') {
            const existing = failedApproaches.get(event.type) || { count: 0, reasons: [] };
            existing.count++;
            if (event.verificationNotes) existing.reasons.push(event.verificationNotes);
            failedApproaches.set(event.type, existing);
        }
    });

    return {
        successfulApproaches: Array.from(successfulApproaches.entries()).map(([type, data]) => ({
            type,
            count: data.count,
            avgEffort: data.efforts.length > 0 ? data.efforts[0] : undefined // Simplified
        })),
        failedApproaches: Array.from(failedApproaches.entries()).map(([type, data]) => ({
            type,
            count: data.count,
            commonReason: data.reasons.length > 0 ? data.reasons[0] : undefined
        })),
        totalAttempts: similarEvents.length
    };
}

/**
 * Generate AI-powered remediation suggestions
 */
export async function getRemediationSuggestions(
    finding: Finding,
    clientId: string
): Promise<RemediationSuggestion[]> {
    // Analyze historical patterns
    const patterns = analyzeRemediationPatterns(finding, clientId);

    // Build context for AI
    const context = `
Finding Details:
- Title: ${finding.title}
- Severity: ${finding.severity}
- Description: ${finding.description}
- Category: ${finding.category || 'N/A'}

Historical Pattern Analysis:
- Total similar attempts: ${patterns.totalAttempts}
- Successful approaches: ${patterns.successfulApproaches.map(a => `${a.type} (${a.count}x)`).join(', ') || 'None'}
- Failed approaches: ${patterns.failedApproaches.map(a => `${a.type} (${a.count}x)`).join(', ') || 'None'}

Current Remediation Guidance: ${finding.remediation}
`;

    const prompt = `You are a senior security engineer analyzing remediation strategies.

${context}

Task: Provide 2-3 specific, actionable remediation approaches for this finding. For each approach:
1. Describe the approach clearly
2. Classify it as one of: code-fix, config-change, infrastructure-update, process-change, compensating-control, third-party-patch, dependency-update, architectural-change, other
3. Estimate effort (e.g., "2 hours", "1 day")
4. Note any warnings based on historical failures

Format as JSON array of objects with: approach, type, effort, warnings (array of strings or empty)

Example:
[
  {
    "approach": "Implement parameterized queries with prepared statements",
    "type": "code-fix",
    "effort": "4 hours",
    "warnings": ["Ensure all dynamic queries are converted", "Test with edge cases"]
  }
]

Provide ONLY the JSON array, no other text.`;

    try {
        const aiResponse = await getGroqCompletion(prompt, "You are a security remediation expert. Output valid JSON only.");
        const approaches = JSON.parse(aiResponse);

        // Enrich with historical data
        const suggestions: RemediationSuggestion[] = approaches.map((approach: any) => {
            const historicalData = patterns.successfulApproaches.find(a => a.type === approach.type);
            const failedData = patterns.failedApproaches.find(a => a.type === approach.type);

            const successCount = historicalData?.count || 0;
            const failCount = failedData?.count || 0;
            const successRate = successCount + failCount > 0
                ? successCount / (successCount + failCount)
                : 0.5;

            return {
                approach: approach.approach,
                type: approach.type as RemediationType,
                successRate,
                sampleSize: successCount + failCount,
                averageEffort: approach.effort,
                warnings: approach.warnings || [],
                examples: [],
                confidence: (() => {
                    const total = successCount + failCount;
                    if (total >= 5) return 'high';
                    if (total >= 2) return 'medium';
                    return 'low';
                })() as 'high' | 'medium' | 'low'
            };
        });

        return suggestions;
    } catch (error) {
        console.error('Failed to generate AI remediation suggestions:', error);

        // Fallback to pattern-based suggestions
        return patterns.successfulApproaches.slice(0, 3).map(approach => ({
            approach: `Use ${approach.type} strategy (historically successful)`,
            type: approach.type,
            successRate: 1.0,
            sampleSize: approach.count,
            averageEffort: approach.avgEffort,
            warnings: [],
            examples: [],
            confidence: 'medium'
        }));
    }
}

/**
 * Identify approaches that have failed historically
 */
export function identifyFailedApproaches(
    finding: Finding,
    clientId: string
): Array<{ approach: string; failureCount: number; reason: string }> {
    const events = getClientRemediationEvents(clientId);

    // Group failed attempts by type
    const failures: Map<RemediationType, { count: number; reasons: string[] }> = new Map();

    events.filter(e => e.outcome === 'failed').forEach(event => {
        const existing = failures.get(event.type) || { count: 0, reasons: [] };
        existing.count++;
        if (event.verificationNotes) {
            existing.reasons.push(event.verificationNotes);
        }
        failures.set(event.type, existing);
    });

    return Array.from(failures.entries())
        .filter(([_, data]) => data.count >= 2) // Only surface patterns (2+ failures)
        .map(([type, data]) => ({
            approach: type,
            failureCount: data.count,
            reason: data.reasons[0] || 'Unknown'
        }));
}

/**
 * Predict effort for a remediation approach
 */
export function predictRemediationEffort(
    finding: Finding,
    remediationType: RemediationType,
    clientId: string
): { estimate: string; confidence: 'high' | 'medium' | 'low' } {
    const events = getClientRemediationEvents(clientId)
        .filter(e => e.type === remediationType && e.actualEffort);

    if (events.length === 0) {
        // No historical data, use defaults based on type
        const defaults: Record<RemediationType, string> = {
            'code-fix': '4 hours',
            'config-change': '1 hour',
            'infrastructure-update': '1 day',
            'process-change': '1 week',
            'compensating-control': '2 days',
            'third-party-patch': '2 hours',
            'dependency-update': '1 hour',
            'architectural-change': '2 weeks',
            'other': '1 day'
        };

        return {
            estimate: defaults[remediationType] || '1 day',
            confidence: 'low'
        };
    }

    // Simple average (in production, would use more sophisticated aggregation)
    const efforts = events.map(e => e.actualEffort!);

    return {
        estimate: efforts[0], // Simplified - would calculate actual average
        confidence: events.length >= 5 ? 'high' : events.length >= 2 ? 'medium' : 'low'
    };
}
