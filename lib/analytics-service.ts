/**
 * Analytics Service
 * 
 * Provides comprehensive analytics calculations for executive insights:
 * - Vulnerability trends over time
 * - Risk scoring and heatmaps
 * - Portfolio-level aggregations
 */

import { Engagement, Finding, Application, ClientProfile } from './types';
import { getAllEngagements, getAllApplications, getAllClients } from './storage';
import { differenceInDays, subDays, parseISO } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface VulnerabilityTrend {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
}

export interface RiskHeatmapCell {
    applicationId: string;
    applicationName: string;
    clientName: string;
    criticalCount: number;
    highCount: number;
    riskScore: number;
    lastAssessment?: string;
}

export interface PortfolioMetrics {
    totalClients: number;
    totalApplications: number;
    totalEngagements: number;
    totalFindings: number;
    averageRiskScore: number;
    highRiskClients: number;
    criticalFindingsOpen: number;
    trendDirection: 'improving' | 'stable' | 'degrading';
}

export interface ClientRiskScore {
    clientId: string;
    clientName: string;
    overallScore: number; // 0-100, higher = more risk
    findingSeverityScore: number;
    recurringIssuesScore: number;
    remediationSpeedScore: number;
    lastAssessmentDate?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Vulnerability Trend Analysis
// ============================================================================

export class AnalyticsService {
    /**
     * Calculate vulnerability trends over time for a specific client or application
     */
    static calculateVulnerabilityTrends(
        scope: 'client' | 'application' | 'portfolio',
        scopeId?: string,
        timeRange: 30 | 90 | 365 | 'all' = 90
    ): VulnerabilityTrend[] {
        const engagements = getAllEngagements();
        const now = new Date();

        // Filter engagements by scope
        let filteredEngagements = engagements;
        if (scope === 'client' && scopeId) {
            filteredEngagements = engagements.filter(e => e.clientId === scopeId);
        } else if (scope === 'application' && scopeId) {
            filteredEngagements = engagements.filter(e => e.applicationId === scopeId);
        }

        // Filter by time range
        if (timeRange !== 'all') {
            const cutoffDate = subDays(now, timeRange);
            filteredEngagements = filteredEngagements.filter(e => {
                const endDate = parseISO(e.metadata.endDate);
                return endDate >= cutoffDate;
            });
        }

        // Sort by end date
        filteredEngagements.sort((a, b) =>
            new Date(a.metadata.endDate).getTime() - new Date(b.metadata.endDate).getTime()
        );

        // Aggregate findings by date
        const trendMap = new Map<string, VulnerabilityTrend>();

        filteredEngagements.forEach(engagement => {
            const date = engagement.metadata.endDate.split('T')[0]; // YYYY-MM-DD

            const existing = trendMap.get(date) || {
                date,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                informational: 0,
                total: 0,
            };

            engagement.findings.forEach(finding => {
                existing.total++;
                switch (finding.severity) {
                    case 'Critical':
                        existing.critical++;
                        break;
                    case 'High':
                        existing.high++;
                        break;
                    case 'Medium':
                        existing.medium++;
                        break;
                    case 'Low':
                        existing.low++;
                        break;
                    case 'Informational':
                        existing.informational++;
                        break;
                }
            });

            trendMap.set(date, existing);
        });

        return Array.from(trendMap.values());
    }

    /**
     * Generate risk heatmap showing all applications and their risk levels
     */
    static generateRiskHeatmap(): RiskHeatmapCell[] {
        const applications = getAllApplications();
        const clients = getAllClients();
        const engagements = getAllEngagements();

        return applications.map(app => {
            const client = clients.find(c => c.id === app.clientId);
            const appEngagements = engagements
                .filter(e => e.applicationId === app.id)
                .sort((a, b) => new Date(b.metadata.endDate).getTime() - new Date(a.metadata.endDate).getTime());

            const latestEngagement = appEngagements[0];

            let criticalCount = 0;
            let highCount = 0;

            if (latestEngagement) {
                latestEngagement.findings.forEach(f => {
                    if (f.severity === 'Critical') criticalCount++;
                    if (f.severity === 'High') highCount++;
                });
            }

            const riskScore = this.calculateApplicationRiskScore(app.id);

            return {
                applicationId: app.id,
                applicationName: app.name,
                clientName: client?.companyName || 'Unknown',
                criticalCount,
                highCount,
                riskScore,
                lastAssessment: latestEngagement?.metadata.endDate,
            };
        }).sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Calculate risk score for a single application (0-100)
     */
    static calculateApplicationRiskScore(applicationId: string): number {
        const engagements = getAllEngagements().filter(e => e.applicationId === applicationId);

        if (engagements.length === 0) return 0;

        // Get latest engagement
        const latest = engagements.sort((a, b) =>
            new Date(b.metadata.endDate).getTime() - new Date(a.metadata.endDate).getTime()
        )[0];

        let score = 0;

        // Severity weighting
        latest.findings.forEach(f => {
            switch (f.severity) {
                case 'Critical':
                    score += 25;
                    break;
                case 'High':
                    score += 10;
                    break;
                case 'Medium':
                    score += 3;
                    break;
                case 'Low':
                    score += 1;
                    break;
            }
        });

        // Cap at 100
        return Math.min(100, score);
    }

    /**
     * Get portfolio-level overview metrics
     */
    static getPortfolioOverview(): PortfolioMetrics {
        const clients = getAllClients();
        const applications = getAllApplications();
        const engagements = getAllEngagements();

        // Calculate total findings
        let totalFindings = 0;
        let criticalFindings = 0;
        engagements.forEach(e => {
            totalFindings += e.findings.length;
            criticalFindings += e.findings.filter(f => f.severity === 'Critical').length;
        });

        // Calculate average risk score
        const clientScores = clients.map(c => this.calculateClientRiskScore(c.id));
        const averageRiskScore = clientScores.length > 0
            ? clientScores.reduce((sum, c) => sum + c.overallScore, 0) / clientScores.length
            : 0;

        // Count high-risk clients
        const highRiskClients = clientScores.filter(c =>
            c.riskLevel === 'high' || c.riskLevel === 'critical'
        ).length;

        // Determine trend direction (simple heuristic: compare last 30 days to previous 30 days)
        const now = new Date();
        const last30Days = subDays(now, 30);
        const previous30Days = subDays(now, 60);

        const recentFindings = engagements
            .filter(e => new Date(e.metadata.endDate) >= last30Days)
            .reduce((sum, e) => sum + e.findings.length, 0);

        const previousFindings = engagements
            .filter(e => {
                const date = new Date(e.metadata.endDate);
                return date >= previous30Days && date < last30Days;
            })
            .reduce((sum, e) => sum + e.findings.length, 0);

        let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentFindings < previousFindings * 0.9) trendDirection = 'improving';
        else if (recentFindings > previousFindings * 1.1) trendDirection = 'degrading';

        return {
            totalClients: clients.length,
            totalApplications: applications.length,
            totalEngagements: engagements.length,
            totalFindings,
            averageRiskScore: Math.round(averageRiskScore),
            highRiskClients,
            criticalFindingsOpen: criticalFindings,
            trendDirection,
        };
    }

    /**
     * Calculate comprehensive risk score for a client
     */
    static calculateClientRiskScore(clientId: string): ClientRiskScore {
        const client = getAllClients().find(c => c.id === clientId);
        const engagements = getAllEngagements().filter(e => e.clientId === clientId);

        if (!client || engagements.length === 0) {
            return {
                clientId,
                clientName: client?.companyName || 'Unknown',
                overallScore: 0,
                findingSeverityScore: 0,
                recurringIssuesScore: 0,
                remediationSpeedScore: 0,
                riskLevel: 'low',
            };
        }

        // Sort by date
        const sortedEngagements = engagements.sort((a, b) =>
            new Date(b.metadata.endDate).getTime() - new Date(a.metadata.endDate).getTime()
        );

        const latestEngagement = sortedEngagements[0];

        // 1. Finding Severity Score (0-40 points)
        let severityScore = 0;
        latestEngagement.findings.forEach(f => {
            switch (f.severity) {
                case 'Critical': severityScore += 10; break;
                case 'High': severityScore += 5; break;
                case 'Medium': severityScore += 2; break;
                case 'Low': severityScore += 0.5; break;
            }
        });
        severityScore = Math.min(40, severityScore);

        // 2. Recurring Issues Score (0-30 points)
        let recurringScore = 0;
        if (sortedEngagements.length >= 2) {
            const previousEngagement = sortedEngagements[1];
            const currentCategories = new Set(latestEngagement.findings.map(f => f.category));
            const previousCategories = new Set(previousEngagement.findings.map(f => f.category));

            const recurring = Array.from(currentCategories).filter(c => previousCategories.has(c));
            recurringScore = Math.min(30, recurring.length * 5);
        }

        // 3. Remediation Speed Score (0-30 points)
        // For now, use a placeholder (would need fix dates in real implementation)
        const remediationScore = sortedEngagements.length > 2 ? 15 : 0;

        // Calculate overall score
        const overallScore = Math.min(100, severityScore + recurringScore + remediationScore);

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (overallScore >= 75) riskLevel = 'critical';
        else if (overallScore >= 50) riskLevel = 'high';
        else if (overallScore >= 25) riskLevel = 'medium';
        else riskLevel = 'low';

        return {
            clientId,
            clientName: client.companyName,
            overallScore: Math.round(overallScore),
            findingSeverityScore: Math.round(severityScore),
            recurringIssuesScore: Math.round(recurringScore),
            remediationSpeedScore: Math.round(remediationScore),
            lastAssessmentDate: latestEngagement.metadata.endDate,
            riskLevel,
        };
    }
}
