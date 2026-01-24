/**
 * Helper function to get findings by engineer
 */

import { loadState } from './storage';
import { Finding } from './types';

/**
 * Get all findings discovered by a specific engineer
 */
export function getFindingsByEngineer(engineerId: string): Finding[] {
    const state = loadState();
    const allFindings: Finding[] = [];

    // Collect findings from all engagements
    if (state.engagements) {
        for (const engagement of state.engagements) {
            if (engagement.findings) {
                allFindings.push(...engagement.findings);
            }
        }
    }

    // Filter to findings discovered by this engineer
    return allFindings.filter(f => f.discoveredBy === engineerId);
}

/**
 * Get findings count by engineer
 */
export function getFindingsCountByEngineer(engineerId: string): number {
    return getFindingsByEngineer(engineerId).length;
}

/**
 * Get findings breakdown by severity for an engineer
 */
export function getFindingsSeverityBreakdown(engineerId: string): Record<string, number> {
    const findings = getFindingsByEngineer(engineerId);
    const breakdown: Record<string, number> = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        Informational: 0
    };

    for (const finding of findings) {
        if (finding.severity in breakdown) {
            breakdown[finding.severity]++;
        }
    }

    return breakdown;
}
