import { CVSSScore, Finding, SeverityLevel } from './types';
import { SEVERITY_LEVELS } from './constants';

// Sort findings by severity (Critical first, Informational last)
export const sortFindingsBySeverity = (findings: Finding[]): Finding[] => {
    return [...findings].sort((a, b) => {
        const severityOrder = SEVERITY_LEVELS.indexOf(a.severity) - SEVERITY_LEVELS.indexOf(b.severity);
        if (severityOrder !== 0) return severityOrder;

        // If same severity, sort by CVSS score (higher first)
        if (a.cvss && b.cvss) {
            return b.cvss.baseScore - a.cvss.baseScore;
        }

        // If only one has CVSS, prioritize it
        if (a.cvss) return -1;
        if (b.cvss) return 1;

        // Otherwise maintain original order
        return 0;
    });
};

// Group findings by severity
export const groupFindingsBySeverity = (findings: Finding[]): Record<SeverityLevel, Finding[]> => {
    const grouped: Record<SeverityLevel, Finding[]> = {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
    };

    findings.forEach(finding => {
        grouped[finding.severity].push(finding);
    });

    return grouped;
};

// Calculate finding statistics
export const calculateFindingStats = (findings: Finding[]) => {
    const grouped = groupFindingsBySeverity(findings);

    return {
        total: findings.length,
        critical: grouped.Critical.length,
        high: grouped.High.length,
        medium: grouped.Medium.length,
        low: grouped.Low.length,
        informational: grouped.Informational.length,
    };
};

// Parse CVSS vector string (basic validation)
export const parseCVSSVector = (vector: string): { version: '3.1' | '4.0'; valid: boolean } => {
    if (vector.startsWith('CVSS:3.1/')) {
        return { version: '3.1', valid: true };
    } else if (vector.startsWith('CVSS:4.0/')) {
        return { version: '4.0', valid: true };
    }
    return { version: '3.1', valid: false };
};

// Calculate CVSS base score from vector (simplified - in production use a proper library)
export const calculateCVSSScore = (vector: string): number => {
    // This is a placeholder - in production, use a proper CVSS calculator library
    // For now, extract from vector if present or return 0
    const match = vector.match(/\/S:([UC])\//);
    if (!match) return 0;

    // Simplified scoring - replace with actual CVSS calculation
    return 7.5;
};

// Format date for display
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Format date range
export const formatDateRange = (startDate: string, endDate: string): string => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Normalize finding language for consistency
export const normalizeFindingText = (text: string): string => {
    // Remove excessive whitespace
    let normalized = text.trim().replace(/\s+/g, ' ');

    // Ensure proper sentence ending
    if (normalized && !normalized.match(/[.!?]$/)) {
        normalized += '.';
    }

    return normalized;
};

// Generate executive summary from findings (Structured/Factual)
export const generateExecutiveSummary = (
    findings: Finding[],
    assessmentType: string,
    clientName: string
): string => {
    const stats = calculateFindingStats(findings);

    // Fallback if no findings
    if (findings.length === 0) {
        return `No security findings were identified during the ${assessmentType.toLowerCase()} of ${clientName}.`;
    }

    const criticalHighCount = stats.critical + stats.high;
    const overallRisk = criticalHighCount > 0 ? 'High' : stats.medium > 0 ? 'Moderate' : 'Low';

    // Structured summary focusing on data
    return [
        `Assessment Scope: ${assessmentType} of ${clientName}.`,
        `Overall Risk Rating: ${overallRisk}.`,
        `Total Findings: ${stats.total}.`,
        `Breakdown: ${stats.critical} Critical, ${stats.high} High, ${stats.medium} Medium, ${stats.low} Low, ${stats.informational} Informational.`,
        criticalHighCount > 0
            ? `Immediate Action Required: ${criticalHighCount} finding(s) pose significant risk to the environment.`
            : `Security Posture: No critical or high severity vulnerabilities were identified.`
    ].join('\n\n');
};

// Validate required fields for finding
export const validateFinding = (finding: Partial<Finding>): string[] => {
    const errors: string[] = [];

    if (!finding.title || finding.title.trim() === '') {
        errors.push('Title is required');
    }

    if (!finding.category) {
        errors.push('Category is required');
    }

    if (!finding.severity) {
        errors.push('Severity is required');
    }

    if (!finding.description || finding.description.trim() === '') {
        errors.push('Description is required');
    }

    if (!finding.impact || finding.impact.trim() === '') {
        errors.push('Impact is required');
    }

    if (!finding.remediation || finding.remediation.trim() === '') {
        errors.push('Remediation is required');
    }

    if (finding.cvss && finding.cvss.vector) {
        const parsed = parseCVSSVector(finding.cvss.vector);
        if (!parsed.valid) {
            errors.push('Invalid CVSS vector format');
        }
    }

    return errors;
};

// Generate finding ID
export const generateFindingId = (): string => {
    return `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Export findings to CSV
export const exportFindingsToCSV = (findings: Finding[]): string => {
    const headers = ['Title', 'Severity', 'Category', 'CVSS Score', 'Status', 'Affected Assets'];
    const rows = findings.map(f => [
        f.title,
        f.severity,
        f.category,
        f.cvss?.baseScore.toString() || 'N/A',
        f.status,
        f.affectedAssets?.join('; ') || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')),
    ].join('\n');

    return csvContent;
};

// Get severity description for risk rating explanation (Standardized)
export const getSeverityDescription = (severity: SeverityLevel): string => {
    const descriptions: Record<SeverityLevel, string> = {
        Critical: 'Exploitation is straightforward and results in direct system compromise or critical data loss. CVSS 9.0-10.0.',
        High: 'Exploitation is possible and results in significant data loss or system compromise. CVSS 7.0-8.9.',
        Medium: 'Exploitation requires special conditions or limited access. CVSS 4.0-6.9.',
        Low: 'Exploitation is difficult or has minimal impact. CVSS 0.1-3.9.',
        Informational: 'Observations for best practice. No direct security risk.',
    };

    return descriptions[severity];
};
