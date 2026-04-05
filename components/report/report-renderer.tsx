/**
 * ReportRenderer - Pure rendering component for security reports
 * 
 * CRITICAL: This component is the single source of truth for report rendering.
 * It MUST produce identical output for:
 * - Final report page
 * - Template preview
 * - PDF generation
 * 
 * NO preview-specific logic allowed. WYSIWYG contract.
 */

'use client';

import { Engagement, ClientProfile, ServiceProviderProfile, ReportTemplate, ReportSection, ReportConfig } from '@/lib/types';
import { REPORT_TEMPLATES } from '@/lib/constants';
import {
    sortFindingsBySeverity,
    calculateFindingStats,
    formatDateRange,
    generateExecutiveSummary,
    getSeverityDescription,
} from '@/lib/report-utils';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { EnhancedCover } from '@/components/report/enhanced-cover';
import { SeverityChart } from '@/components/report/severity-chart';
import { CategoryChart } from '@/components/report/category-chart';
import { RiskMatrix } from '@/components/report/risk-matrix';
import { HistoricalComparison } from '@/components/report/historical-comparison';
import { cn } from '@/lib/utils';

export interface ReportRendererProps {
    engagement: Engagement;
    client: ClientProfile;
    provider: ServiceProviderProfile;
    template?: ReportTemplate; // Optional override (defaults to engagement.templateId)
    reportConfig?: ReportConfig; // Optional override (defaults to engagement.reportConfig)
    className?: string;
    highlightSections?: string[]; // For editing mode - highlight modified sections
}

/**
 * ReportRenderer Component
 * 
 * Pure, stateless component that renders a security report.
 * Used by:
 * - /app/engagement/[id]/report/page.tsx (final report)
 * - TemplatePreviewer (preview during creation/selection/editing)
 */
export function ReportRenderer({
    engagement,
    client,
    provider,
    template: templateOverride,
    reportConfig: configOverride,
    className,
    highlightSections = []
}: ReportRendererProps) {
    // Resolve template
    const template = templateOverride || REPORT_TEMPLATES[engagement.templateId];
    if (!template) {
        throw new Error(`Template not found: ${engagement.templateId}`);
    }

    // Resolve config
    const config = configOverride || engagement.reportConfig || {
        sections: template.sections,
        teamMembers: [],
        contacts: []
    };

    // Merge branding
    const effectiveBranding = {
        ...template.branding,
        ...(config.brandingOverride || {})
    };

    // Resolve brand colors with fallbacks
    const brandColors = {
        primary: effectiveBranding.primaryColor || '#1F2937',
        secondary: effectiveBranding.secondaryColor || '#4B5563',
        accent: effectiveBranding.accentColor || '#2563EB',
        heading: effectiveBranding.headingColor || effectiveBranding.primaryColor || '#111827',
        border: effectiveBranding.borderColor || effectiveBranding.secondaryColor || '#E5E7EB',
        tableHeaderBg: effectiveBranding.tableHeaderBg || effectiveBranding.primaryColor || '#1F2937',
        tableHeaderText: effectiveBranding.tableHeaderText || '#FFFFFF',
        link: effectiveBranding.linkColor || effectiveBranding.accentColor || '#2563EB',
    };

    // Apply visual style
    const visualStyle = {
        fontFamily: config.visualStyleOverride?.fontFamily || template.visualStyle?.fontFamily || 'system',
        spacingDensity: config.visualStyleOverride?.spacingDensity || template.visualStyle?.spacingDensity || 'comfortable',
        headingScale: config.visualStyleOverride?.headingScale || template.visualStyle?.headingScale || 'comfortable',
    };

    const fontClassMap: Record<string, string> = {
        inter: 'font-sans',
        roboto: 'font-mono',
        opensans: 'font-sans',
        system: 'font-sans',
    };

    const fontClass = fontClassMap[visualStyle.fontFamily] || 'font-sans';
    const spacingClass = visualStyle.spacingDensity === 'compact' ? 'leading-normal' : 'leading-loose';

    // Brand-aware heading style applied throughout
    const headingStyle = { color: brandColors.heading };
    const borderStyle = { borderColor: brandColors.border };

    const sectionsToRender: ReportSection[] = config.sections || template.sections;
    const sortedFindings = sortFindingsBySeverity(engagement.findings);
    const stats = calculateFindingStats(engagement.findings);

    const executiveSummaryText = config.sectionOverrides?.['executiveSummary'] ||
        config.executiveSummaryOverride ||
        generateExecutiveSummary(
            engagement.findings,
            engagement.metadata.assessmentType,
            client.companyName
        );

    const conclusion = config.sectionOverrides?.['conclusion'] || config.conclusionOverride || '';
    const coverDefaults = effectiveBranding?.coverSettings;

    // Cover props
    const coverProps = {
        assessmentType: engagement.metadata.assessmentType,
        clientName: client.companyName,
        providerName: provider.companyName,
        engagementName: engagement.metadata.engagementName,
        dateRange: formatDateRange(engagement.metadata.startDate, engagement.metadata.endDate),
        providerContact: provider.contactEmail,
        providerWebsite: provider.website,
        clientLogoUrl: effectiveBranding.clientLogoUrl,
        providerLogoUrl: effectiveBranding.providerLogoUrl
    };

    /**
     * Section Renderer
     * 
     * Takes a ReportSection and returns the appropriate JSX.
     * This is the core rendering logic - must be identical across all uses.
     */
    const renderSection = (section: ReportSection) => {
        const isHighlighted = highlightSections.includes(section.id);

        switch (section.id) {
            case 'coverPage':
                if (effectiveBranding?.useEnhancedCover || effectiveBranding?.coverGraphicUrl || effectiveBranding?.coverBackgroundImageUrl) {
                    return (
                        <EnhancedCover
                            key={section.id}
                            assessmentType={coverProps.assessmentType}
                            clientName={coverProps.clientName}
                            providerName={coverProps.providerName}
                            engagementName={coverProps.engagementName}
                            dateRange={coverProps.dateRange}
                            clientLogoUrl={coverProps.clientLogoUrl}
                            providerLogoUrl={coverProps.providerLogoUrl}
                            primaryColor={brandColors.primary}
                            secondaryColor={brandColors.secondary}
                            accentColor={brandColors.accent}
                            coverTextColor={effectiveBranding.coverTextColor}
                            coverBackgroundImageUrl={effectiveBranding.coverBackgroundImageUrl}
                            coverGraphicUrl={effectiveBranding.coverGraphicUrl}
                            coverGraphicPosition={effectiveBranding.coverGraphicPosition}
                            coverTitle={config.coverOverride?.title || coverDefaults?.title}
                            coverSubtitle={config.coverOverride?.subtitle || coverDefaults?.subtitle}
                            coverFooterText={config.coverOverride?.footerText || coverDefaults?.footerText}
                        />
                    );
                }

                return (
                    <div className="page-break-after mb-20 text-center">
                        <div className="mb-12 mt-48">
                            <h1 className="mb-6 text-3xl font-semibold" style={headingStyle}>{coverProps.assessmentType}</h1>
                            <h2 className="text-2xl font-medium text-gray-700">{coverProps.clientName}</h2>
                        </div>
                        <div className="mb-12 mt-24">
                            <p className="text-lg font-medium text-gray-800">{coverProps.engagementName}</p>
                            <p className="mt-3 text-sm text-gray-600">
                                {coverProps.dateRange}
                            </p>
                        </div>
                        <div className="mt-24 border-t pt-12" style={borderStyle}>
                            <p className="text-xl font-medium text-gray-900">{coverProps.providerName}</p>
                            {coverProps.providerContact && (
                                <p className="mt-2 text-sm text-gray-600">{coverProps.providerContact}</p>
                            )}
                            {coverProps.providerWebsite && <p className="text-sm text-gray-600">{coverProps.providerWebsite}</p>}
                            {(config.coverOverride?.footerText || coverDefaults?.footerText) && (
                                <p className="mt-8 text-xs text-gray-400">{config.coverOverride?.footerText || coverDefaults?.footerText}</p>
                            )}
                        </div>
                    </div>
                );

            case 'confidentialityNotice':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-6 text-xl font-semibold" style={headingStyle}>Confidentiality Notice</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                return (
                    <div className="mb-12">
                        <h2 className="mb-6 text-xl font-semibold" style={headingStyle}>Confidentiality Notice</h2>
                        <div className="rounded border p-8" style={{ borderColor: brandColors.border, backgroundColor: `${brandColors.primary}05` }}>
                            <p className="text-sm leading-loose text-gray-700">{provider.legalDisclaimer}</p>
                        </div>
                    </div>
                );

            case 'executiveSummary':
                return (
                    <div className="mb-16">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Executive Summary</h2>
                        <div className="mb-10 whitespace-pre-line leading-loose text-gray-700">
                            {executiveSummaryText}
                        </div>

                        <div className="mt-12">
                            <h3 className="mb-6 text-lg font-medium" style={headingStyle}>Risk Profile</h3>

                            {(effectiveBranding?.showChartsInExecutiveSummary || effectiveBranding?.showRiskMatrix) && (
                                <div className="mb-8 grid grid-cols-1 gap-12 print:grid-cols-1 page-break-inside-avoid">
                                    {effectiveBranding?.showChartsInExecutiveSummary && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                            <SeverityChart findings={engagement.findings} />
                                            <CategoryChart findings={engagement.findings} />
                                        </div>
                                    )}
                                    {effectiveBranding?.showRiskMatrix && (
                                        <div className="flex justify-center mt-4">
                                            <div className="w-full max-w-2xl transform scale-95 origin-top">
                                                <RiskMatrix findings={engagement.findings} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!effectiveBranding?.showChartsInExecutiveSummary && (
                                <div className="grid grid-cols-5 gap-6">
                                    <div className="border-b-2 border-red-200 pb-4 text-center">
                                        <p className="text-3xl font-medium text-red-700">{stats.critical}</p>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-red-900">Critical</p>
                                    </div>
                                    <div className="border-b-2 border-orange-200 pb-4 text-center">
                                        <p className="text-3xl font-medium text-orange-700">{stats.high}</p>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-orange-900">High</p>
                                    </div>
                                    <div className="border-b-2 border-yellow-200 pb-4 text-center">
                                        <p className="text-3xl font-medium text-yellow-600">{stats.medium}</p>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-yellow-800">Medium</p>
                                    </div>
                                    <div className="border-b-2 border-blue-200 pb-4 text-center">
                                        <p className="text-3xl font-medium text-blue-600">{stats.low}</p>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-blue-800">Low</p>
                                    </div>
                                    <div className="border-b-2 border-gray-200 pb-4 text-center">
                                        <p className="text-3xl font-medium text-gray-600">{stats.informational}</p>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-700">Info</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'historicalComparison':
                return (
                    <div className="mb-16">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Historical Comparison</h2>
                        <HistoricalComparison currentEngagement={engagement} />
                    </div>
                );

            case 'teamMembers':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Engagement Team</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                if (!config.teamMembers || config.teamMembers.length === 0) return null;
                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Engagement Team</h2>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr style={{ borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: brandColors.primary }}>
                                    <th className="pb-3 font-medium" style={headingStyle}>Name</th>
                                    <th className="pb-3 font-medium" style={headingStyle}>Role</th>
                                    <th className="pb-3 font-medium" style={headingStyle}>Qualifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                {config.teamMembers.map((member: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-200">
                                        <td className="py-4 font-medium text-gray-800">{member.name}</td>
                                        <td className="py-4 text-gray-600">{member.role}</td>
                                        <td className="py-4 text-gray-600">{member.qualifications}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'scopeAndMethodology':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Scope and Methodology</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Scope and Methodology</h2>

                        <h3 className="mb-3 text-lg font-medium" style={headingStyle}>Testing Methodology</h3>
                        <p className="mb-8 leading-loose text-gray-700">{engagement.metadata.testingMethodology}</p>

                        <h3 className="mb-3 text-lg font-medium" style={headingStyle}>Assessment Period</h3>
                        <p className="mb-8 leading-loose text-gray-700">
                            {formatDateRange(engagement.metadata.startDate, engagement.metadata.endDate)}
                        </p>

                        {engagement.metadata.scope.length > 0 && (
                            <>
                                <h3 className="mb-3 text-lg font-medium" style={headingStyle}>In Scope</h3>
                                <ul className="mb-8 list-disc pl-6 space-y-1">
                                    {engagement.metadata.scope.map((item, i) => (
                                        <li key={i} className="leading-loose text-gray-700">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {engagement.metadata.outOfScope.length > 0 && (
                            <>
                                <h3 className="mb-3 text-lg font-medium" style={headingStyle}>Out of Scope</h3>
                                <ul className="mb-8 list-disc pl-6 space-y-1">
                                    {engagement.metadata.outOfScope.map((item, i) => (
                                        <li key={i} className="leading-loose text-gray-700">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {engagement.metadata.assumptions.length > 0 && (
                            <>
                                <h3 className="mb-3 text-lg font-medium" style={headingStyle}>Assumptions</h3>
                                <ul className="mb-8 list-disc pl-6 space-y-1">
                                    {engagement.metadata.assumptions.map((item, i) => (
                                        <li key={i} className="leading-loose text-gray-700">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {engagement.metadata.limitations.length > 0 && (
                            <>
                                <h3 className="mb-3 text-lg font-medium" style={headingStyle}>Limitations</h3>
                                <ul className="mb-8 list-disc pl-6 space-y-1">
                                    {engagement.metadata.limitations.map((item, i) => (
                                        <li key={i} className="leading-loose text-gray-700">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                );

            case 'riskRatingExplanation':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Risk Rating Explanation</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Risk Rating Explanation</h2>
                        <div className="space-y-6">
                            {['Critical', 'High', 'Medium', 'Low', 'Informational'].map((sev) => (
                                <div key={sev} className="border-l-2 pl-6" style={{ borderColor: brandColors.border }}>
                                    <div className="mb-2 flex items-center gap-2">
                                        <SeverityBadge severity={sev as any} />
                                    </div>
                                    <p className="text-sm leading-loose text-gray-700">
                                        {getSeverityDescription(sev as any)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'findingsSummaryTable':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Findings Summary</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                if (sortedFindings.length === 0) return null;
                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Findings Summary</h2>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr style={{ borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: brandColors.primary }}>
                                    <th className="pb-3 font-medium" style={headingStyle}>#</th>
                                    <th className="pb-3 font-medium" style={headingStyle}>Title</th>
                                    <th className="pb-3 font-medium" style={headingStyle}>Severity</th>
                                    {template.includeCVSS && (
                                        <th className="pb-3 font-medium" style={headingStyle}>CVSS</th>
                                    )}
                                    <th className="pb-3 font-medium" style={headingStyle}>Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFindings.map((finding, index) => (
                                    <tr key={finding.id} className="border-b border-gray-200">
                                        <td className="py-4 text-gray-800">{index + 1}</td>
                                        <td className="py-4 text-gray-800">{finding.title}</td>
                                        <td className="py-4">
                                            <SeverityBadge severity={finding.severity} />
                                        </td>
                                        {template.includeCVSS && (
                                            <td className="py-4 text-gray-700">
                                                {finding.cvss?.baseScore || 'N/A'}
                                            </td>
                                        )}
                                        <td className="py-4 text-gray-700">
                                            {finding.category || finding.threatCategory || finding.concernCategory || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'detailedFindings':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-10 text-xl font-semibold" style={headingStyle}>Detailed Findings</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                if (sortedFindings.length === 0) return null;
                return (
                    <div className="mb-12">
                        <h2 className="mb-10 text-xl font-semibold" style={headingStyle}>Detailed Findings</h2>
                        {sortedFindings.map((finding, index) => (
                            <div key={finding.id} className="page-break-before py-12 border-l-2 pl-8" style={{ borderColor: brandColors.border }}>
                                <div className="mb-6 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {index + 1}. {finding.title}
                                        </h3>
                                        <div className="mt-3 flex items-center gap-3">
                                            <SeverityBadge severity={finding.severity} />
                                            {template.includeCVSS && finding.cvss && (
                                                <span className="text-sm text-gray-600">
                                                    CVSS: {finding.cvss.baseScore}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">
                                        {finding.findingType === 'threat-model' ? 'STRIDE Category' :
                                            finding.findingType === 'architecture' ? 'Concern Category' : 'Category'}
                                    </h4>
                                    <p className="text-sm leading-loose text-gray-700">{finding.category || finding.threatCategory || finding.concernCategory || 'N/A'}</p>
                                </div>

                                {finding.affectedAssets && finding.affectedAssets.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="mb-2 text-sm font-medium text-gray-900">Affected Assets</h4>
                                        <ul className="list-disc pl-6 space-y-1">
                                            {finding.affectedAssets.map((asset, i) => (
                                                <li key={i} className="text-sm leading-loose text-gray-700">{asset}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">Description</h4>
                                    <p className="text-sm leading-loose text-gray-700">{finding.description}</p>
                                </div>

                                <div className="mb-6">
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">Impact</h4>
                                    <p className="text-sm leading-loose text-gray-700">{finding.impact}</p>
                                </div>

                                {finding.stepsToReproduce && template.technicalVerbosity !== 'Low' && (
                                    <div className="mb-6">
                                        <h4 className="mb-2 text-sm font-medium text-gray-900">Steps to Reproduce</h4>
                                        <pre className="whitespace-pre-wrap border-l-2 border-gray-300 bg-gray-50 p-6 text-xs leading-relaxed text-gray-800 font-mono">
                                            {finding.stepsToReproduce}
                                        </pre>
                                    </div>
                                )}

                                {finding.proofOfConcept && template.technicalVerbosity === 'High' && (
                                    <div className="mb-6">
                                        <h4 className="mb-2 text-sm font-medium text-gray-900">Proof of Concept</h4>
                                        <pre className="whitespace-pre-wrap border-l-2 border-gray-300 bg-gray-50 p-6 text-xs leading-relaxed text-gray-800 font-mono">
                                            {finding.proofOfConcept}
                                        </pre>
                                    </div>
                                )}

                                {finding.evidenceFiles && finding.evidenceFiles.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="mb-3 text-sm font-medium text-gray-900">Evidence</h4>
                                        <div className="space-y-8">
                                            {finding.evidenceFiles.map((file) => (
                                                <div key={file.id} className="bg-white">
                                                    {file.type.startsWith('image/') ? (
                                                        <div className="mb-4">
                                                            <img
                                                                src={file.data}
                                                                alt={file.name}
                                                                className="w-full h-auto object-contain shadow-md border border-gray-200 rounded-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-32 items-center justify-center bg-gray-50 text-3xl border border-gray-200 rounded-sm">
                                                            {file.type === 'application/pdf' ? '📄' : '📎'}
                                                        </div>
                                                    )}
                                                    <p className="text-center text-xs text-gray-600 truncate mt-2 font-medium">{file.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">Remediation</h4>
                                    <p className="text-sm leading-loose text-gray-700">{finding.remediation}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'recommendations':
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Recommendations</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Recommendations</h2>
                        <p className="mb-6 leading-loose text-gray-700">
                            Based on the findings identified during this assessment, the following recommendations
                            are provided:
                        </p>
                        <ul className="list-disc space-y-3 pl-6">
                            <li className="leading-loose text-gray-700">
                                Prioritize remediation of Critical and High severity findings as they pose the most
                                significant risk to the organization.
                            </li>
                            <li className="leading-loose text-gray-700">
                                Implement a regular security testing program to identify and address vulnerabilities
                                on an ongoing basis.
                            </li>
                            <li className="leading-loose text-gray-700">
                                Provide security awareness training to development and operations teams to prevent
                                common vulnerabilities.
                            </li>
                            <li className="leading-loose text-gray-700">
                                Establish a vulnerability management process to track and verify remediation efforts.
                            </li>
                            <li className="leading-loose text-gray-700">
                                Consider implementing automated security testing in the development pipeline.
                            </li>
                        </ul>
                    </div>
                );

            case 'conclusion':
                const conclusionContent = config.sectionOverrides?.[section.id] || conclusion;

                if (conclusionContent) {
                    return (
                        <div className="mb-12">
                            <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Conclusion</h2>
                            <div className="leading-loose text-gray-700 whitespace-pre-line space-y-4">
                                {conclusionContent}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="mb-12">
                        <h2 className="mb-8 text-xl font-semibold" style={headingStyle}>Conclusion</h2>
                        <div className="leading-loose text-gray-700 whitespace-pre-line space-y-4">
                            <p>
                                This {engagement.metadata.assessmentType.toLowerCase()} has identified{' '}
                                {stats.total} security finding{stats.total !== 1 ? 's' : ''} that require attention.
                                The findings detailed in this report should be addressed according to their severity
                                levels and potential impact on the organization.
                            </p>
                            <p>
                                {provider.companyName} recommends conducting follow-up testing after remediation to
                                verify that the identified vulnerabilities have been properly addressed. For questions
                                or clarifications regarding this report, please contact {provider.contactEmail}.
                            </p>
                        </div>
                    </div>
                );

            default:
                // Custom sections
                const content = config.sectionOverrides?.[section.id] || section.content || '';
                return (
                    <div className="mb-12">
                        {section.title && <h2 className="mb-6 text-xl font-semibold" style={headingStyle}>{section.title}</h2>}
                        <MarkdownRenderer
                            content={content}
                            variant="report"
                        />
                    </div>
                );
        }
    };

    // Resolve custom Google Fonts for brand typography
    const brandFontFamily = effectiveBranding.primaryFont
        ? `"${effectiveBranding.primaryFont}", ${fontClassMap[visualStyle.fontFamily] === 'font-mono' ? 'monospace' : 'sans-serif'}`
        : undefined;

    return (
        <div
            className={cn('report-renderer', fontClass, spacingClass, className)}
            style={brandFontFamily ? { fontFamily: brandFontFamily } : undefined}
        >
            {sectionsToRender.map((section) => {
                if (!section.isVisible) return null;

                const isHighlighted = highlightSections.includes(section.id);

                return (
                    <div
                        key={section.id}
                        className={cn(
                            'page-break-before print:pt-0',
                            isHighlighted && 'ring-2 ring-yellow-400 ring-offset-4 rounded animate-pulse'
                        )}
                    >
                        {renderSection(section)}
                    </div>
                );
            })}
        </div>
    );
}
