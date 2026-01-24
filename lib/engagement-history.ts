/**
 * Engagement History Service
 * 
 * Provides historical context, similarity detection, and engineer recommendations
 * for repeat engagements on the same application.
 * 
 * CRITICAL PRINCIPLES:
 * - Present context, not conclusions
 * - Never claim automatic detection
 * - All recommendations are suggestions, not rankings
 */

import { Engagement, Finding, Engineer, Application, SeverityLevel } from './types';
import { getAllEngagements, getEngagement, getApplication, getAllEngineers } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface HistoricalContext {
    previousEngagements: Engagement[];
    totalPreviousEngagements: number;
    pastFindings: HistoricalFinding[];
    recurringVulnerabilityClasses: VulnerabilityClassPattern[];
    highRiskAreas: string[];
}

export interface HistoricalFinding {
    finding: Finding;
    engagementId: string;
    engagementName: string;
    engagementDate: string;
    status: string;
}

export interface VulnerabilityClassPattern {
    className: string;
    occurrences: number;
    firstSeen: string;
    lastSeen: string;
    engagementIds: string[];
}

export interface SimilarFinding {
    finding: Finding;
    engagementId: string;
    engagementName: string;
    similarity: {
        sameClass: boolean;
        sameComponent: boolean;
        sameSeverity: boolean;
    };
    contextMessage: string;
}

export interface EngineerRecommendation {
    engineer: Engineer;
    reason: string;
    previousEngagements: number;
    lastWorkedDate?: string;
}

// ============================================================================
// Historical Context Retrieval
// ============================================================================

/**
 * Get historical context for an application
 * Returns summary of previous engagements and findings
 */
export function getHistoricalContext(applicationId: string): HistoricalContext {
    const allEngagements = getAllEngagements();

    // Get previous engagements for this application
    const previousEngagements = allEngagements
        .filter(e => e.applicationId === applicationId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Collect all findings from previous engagements
    const pastFindings: HistoricalFinding[] = [];
    previousEngagements.forEach(engagement => {
        engagement.findings.forEach(finding => {
            pastFindings.push({
                finding,
                engagementId: engagement.id,
                engagementName: engagement.metadata.engagementName,
                engagementDate: engagement.metadata.startDate,
                status: finding.status,
            });
        });
    });

    // Identify recurring vulnerability classes
    const recurringVulnerabilityClasses = identifyRecurringClasses(pastFindings);

    // Identify high-risk areas (components/endpoints with multiple findings)
    const highRiskAreas = identifyHighRiskAreas(pastFindings);

    return {
        previousEngagements,
        totalPreviousEngagements: previousEngagements.length,
        pastFindings,
        recurringVulnerabilityClasses,
        highRiskAreas,
    };
}

/**
 * Identify recurring vulnerability classes across engagements
 */
function identifyRecurringClasses(pastFindings: HistoricalFinding[]): VulnerabilityClassPattern[] {
    const classMap = new Map<string, VulnerabilityClassPattern>();

    pastFindings.forEach(({ finding, engagementId, engagementDate }) => {
        const className = finding.category || finding.threatCategory || 'Unknown';

        if (!classMap.has(className)) {
            classMap.set(className, {
                className,
                occurrences: 0,
                firstSeen: engagementDate,
                lastSeen: engagementDate,
                engagementIds: [],
            });
        }

        const pattern = classMap.get(className)!;
        pattern.occurrences++;
        pattern.lastSeen = engagementDate;

        if (!pattern.engagementIds.includes(engagementId)) {
            pattern.engagementIds.push(engagementId);
        }
    });

    // Return only classes that appear multiple times
    return Array.from(classMap.values())
        .filter(p => p.occurrences > 1)
        .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Identify high-risk areas (components/endpoints with multiple findings)
 */
function identifyHighRiskAreas(pastFindings: HistoricalFinding[]): string[] {
    const areaMap = new Map<string, number>();

    pastFindings.forEach(({ finding }) => {
        // Collect areas from different finding types
        const areas: string[] = [];

        if (finding.affectedAssets) areas.push(...finding.affectedAssets);
        if (finding.affectedComponent) areas.push(finding.affectedComponent);
        if (finding.designComponent) areas.push(finding.designComponent);

        areas.forEach(area => {
            areaMap.set(area, (areaMap.get(area) || 0) + 1);
        });
    });

    // Return areas with 2+ findings
    return Array.from(areaMap.entries())
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([area, _]) => area);
}

// ============================================================================
// Finding Similarity Detection
// ============================================================================

/**
 * Find similar findings for a given finding in the same application
 * Returns context, NOT automatic detection claims
 */
export function findSimilarFindings(
    finding: Finding,
    applicationId: string,
    currentEngagementId?: string
): SimilarFinding[] {
    const context = getHistoricalContext(applicationId);
    const similarFindings: SimilarFinding[] = [];

    context.pastFindings.forEach(({ finding: pastFinding, engagementId, engagementName }) => {
        // Skip findings from current engagement
        if (currentEngagementId && engagementId === currentEngagementId) return;

        // Check similarity criteria
        const sameClass = isSameVulnerabilityClass(finding, pastFinding);
        const sameComponent = hasSameComponent(finding, pastFinding);
        const sameSeverity = finding.severity === pastFinding.severity;

        // Only include if there's some similarity
        if (sameClass || sameComponent) {
            similarFindings.push({
                finding: pastFinding,
                engagementId,
                engagementName,
                similarity: {
                    sameClass,
                    sameComponent,
                    sameSeverity,
                },
                contextMessage: buildContextMessage(sameClass, sameComponent, sameSeverity, engagementName),
            });
        }
    });

    return similarFindings;
}

/**
 * Check if two findings belong to the same vulnerability class
 */
function isSameVulnerabilityClass(finding1: Finding, finding2: Finding): boolean {
    const class1 = finding1.category || finding1.threatCategory || '';
    const class2 = finding2.category || finding2.threatCategory || '';
    return class1 === class2 && class1 !== '';
}

/**
 * Check if two findings affect the same component
 */
function hasSameComponent(finding1: Finding, finding2: Finding): boolean {
    const components1 = new Set([
        ...(finding1.affectedAssets || []),
        finding1.affectedComponent,
        finding1.designComponent,
    ].filter(Boolean));

    const components2 = new Set([
        ...(finding2.affectedAssets || []),
        finding2.affectedComponent,
        finding2.designComponent,
    ].filter(Boolean));

    // Check for intersection
    for (const comp of components1) {
        if (components2.has(comp)) return true;
    }

    return false;
}

/**
 * Build context message for similar finding
 * CRITICAL: Use passive language, no detection claims
 */
function buildContextMessage(
    sameClass: boolean,
    sameComponent: boolean,
    sameSeverity: boolean,
    engagementName: string
): string {
    const parts: string[] = [];

    if (sameClass) {
        parts.push('This vulnerability class was observed');
    }
    if (sameComponent) {
        parts.push('Similar component/endpoint');
    }
    if (sameSeverity) {
        parts.push('Same severity level');
    }

    return `${parts.join(' • ')} in previous engagement "${engagementName}"`;
}

// ============================================================================
// Engineer Recommendations
// ============================================================================

/**
 * Get engineer recommendations for an application
 * Based on previous work, NOT skill rankings
 */
export function getEngineerRecommendations(applicationId: string): EngineerRecommendation[] {
    const allEngagements = getAllEngagements();
    const allEngineers = getAllEngineers();

    // Find engagements for this application
    const appEngagements = allEngagements.filter(e => e.applicationId === applicationId);

    // Track engineer involvement
    const engineerInvolvement = new Map<string, {
        count: number;
        lastDate?: string;
    }>();

    appEngagements.forEach(engagement => {
        (engagement.engineerIds || []).forEach(engineerId => {
            const current = engineerInvolvement.get(engineerId) || { count: 0 };
            current.count++;

            const engagementDate = engagement.metadata.endDate || engagement.createdAt;
            if (!current.lastDate || engagementDate > current.lastDate) {
                current.lastDate = engagementDate;
            }

            engineerInvolvement.set(engineerId, current);
        });
    });

    // Build recommendations
    const recommendations: EngineerRecommendation[] = [];

    engineerInvolvement.forEach((involvement, engineerId) => {
        const engineer = allEngineers.find(e => e.id === engineerId);
        if (!engineer) return;

        recommendations.push({
            engineer,
            reason: `Has worked on ${involvement.count} previous engagement${involvement.count > 1 ? 's' : ''} for this application`,
            previousEngagements: involvement.count,
            lastWorkedDate: involvement.lastDate,
        });
    });

    // Sort by involvement (passive, not ranking)
    recommendations.sort((a, b) => b.previousEngagements - a.previousEngagements);

    return recommendations;
}

// ============================================================================
// Change Report Generation
// ============================================================================

export interface ChangeReport {
    newFindings: Finding[];
    fixedFindings: HistoricalFinding[];
    recurringFindings: Array<{
        currentFinding: Finding;
        previousFinding: HistoricalFinding;
    }>;
    summary: string;
}

/**
 * Generate "What changed since last assessment" report
 */
export function generateChangeReport(
    currentEngagement: Engagement,
    previousEngagementId?: string
): ChangeReport | null {
    if (!previousEngagementId) {
        // Find most recent previous engagement for same application
        const allEngagements = getAllEngagements();
        const sameAppEngagements = allEngagements
            .filter(e =>
                e.applicationId === currentEngagement.applicationId &&
                e.id !== currentEngagement.id &&
                new Date(e.createdAt) < new Date(currentEngagement.createdAt)
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (sameAppEngagements.length === 0) return null;
        previousEngagementId = sameAppEngagements[0].id;
    }

    const previousEngagement = getEngagement(previousEngagementId);
    if (!previousEngagement) return null;

    // Categorize findings
    const newFindings: Finding[] = [];
    const recurringFindings: Array<{
        currentFinding: Finding;
        previousFinding: HistoricalFinding;
    }> = [];

    currentEngagement.findings.forEach(currentFinding => {
        const similar = findSimilarFindings(currentFinding, currentEngagement.applicationId, currentEngagement.id);
        const previousSimilar = similar.find(s => s.engagementId === previousEngagementId);

        if (previousSimilar) {
            recurringFindings.push({
                currentFinding,
                previousFinding: {
                    finding: previousSimilar.finding,
                    engagementId: previousSimilar.engagementId,
                    engagementName: previousSimilar.engagementName,
                    engagementDate: previousEngagement.metadata.startDate,
                    status: previousSimilar.finding.status,
                },
            });
        } else {
            newFindings.push(currentFinding);
        }
    });

    // Find fixed findings (in previous but not current)
    const fixedFindings: HistoricalFinding[] = [];
    previousEngagement.findings.forEach(prevFinding => {
        const stillPresent = recurringFindings.some(r =>
            isSameVulnerabilityClass(r.previousFinding.finding, prevFinding)
        );

        if (!stillPresent) {
            fixedFindings.push({
                finding: prevFinding,
                engagementId: previousEngagementId!,
                engagementName: previousEngagement.metadata.engagementName,
                engagementDate: previousEngagement.metadata.startDate,
                status: 'Fixed',
            });
        }
    });

    const summary = buildChangeSummary(newFindings.length, fixedFindings.length, recurringFindings.length);

    return {
        newFindings,
        fixedFindings,
        recurringFindings,
        summary,
    };
}

function buildChangeSummary(newCount: number, fixedCount: number, recurringCount: number): string {
    const parts: string[] = [];

    if (newCount > 0) parts.push(`${newCount} new finding${newCount > 1 ? 's' : ''}`);
    if (fixedCount > 0) parts.push(`${fixedCount} fixed finding${fixedCount > 1 ? 's' : ''}`);
    if (recurringCount > 0) parts.push(`${recurringCount} recurring finding${recurringCount > 1 ? 's' : ''}`);

    if (parts.length === 0) return 'No changes detected';

    return parts.join(', ');
}
