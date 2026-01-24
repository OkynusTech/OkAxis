'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getEngagement, getClient, getServiceProvider } from '@/lib/storage';
import { Engagement, ClientProfile, ServiceProviderProfile, ReportSection } from '@/lib/types';
import { REPORT_TEMPLATES } from '@/lib/constants';
import {
    sortFindingsBySeverity,
    calculateFindingStats,
    formatDateRange,
    generateExecutiveSummary,
    getSeverityDescription,
} from '@/lib/report-utils';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { ArrowLeft, Printer } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { EnhancedCover } from '@/components/report/enhanced-cover';
import { SeverityChart } from '@/components/report/severity-chart';
import { CategoryChart } from '@/components/report/category-chart';
import { RiskMatrix } from '@/components/report/risk-matrix';
import { HistoricalComparison } from '@/components/report/historical-comparison';

export default function ReportPage() {
    const params = useParams();
    const router = useRouter();
    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [provider, setServiceProvider] = useState<ServiceProviderProfile | null>(null);

    useEffect(() => {
        if (params.id) {
            const rawEngagement = getEngagement(params.id as string);
            if (rawEngagement) {
                const engagementData = rawEngagement;
                setEngagement(engagementData);

                if (engagementData.clientId) {
                    setClient(getClient(engagementData.clientId));
                }
                if (engagementData.serviceProviderId) {
                    setServiceProvider(getServiceProvider(engagementData.serviceProviderId));
                }
            }
        }
    }, [params.id]);

    const handlePrint = () => {
        window.print();
    };

    if (!engagement || !client || !provider) {
        return <div className="p-8">Loading report...</div>;
    }

    const { reportConfig } = engagement;
    const template = REPORT_TEMPLATES[engagement.templateId];

    const config = reportConfig || {
        sections: template.sections,
        teamMembers: [],
        contacts: []
    };

    // Merge branding from template and engagement override
    const effectiveBranding = {
        ...template.branding,
        ...(config.brandingOverride || {})
    };

    // Apply visual style overrides
    // Visual style comes from the Template root, not branding object
    const visualStyle = {
        fontFamily: config.visualStyleOverride?.fontFamily || template.visualStyle?.fontFamily || 'system',
        spacingDensity: config.visualStyleOverride?.spacingDensity || template.visualStyle?.spacingDensity || 'comfortable',
        headingScale: config.visualStyleOverride?.headingScale || template.visualStyle?.headingScale || 'comfortable',
    };

    const fontClassMap: Record<string, string> = {
        inter: 'font-sans',
        roboto: 'font-mono', // Using mono as proxy/placeholder
        opensans: 'font-sans',
        system: 'font-sans',
    };

    const fontClass = fontClassMap[visualStyle.fontFamily] || 'font-sans';
    const spacingClass = visualStyle.spacingDensity === 'compact' ? 'leading-normal' : 'leading-loose';

    const sectionsToRender: ReportSection[] = config.sections || template.sections;

    const sortedFindings = sortFindingsBySeverity(engagement.findings);
    const stats = calculateFindingStats(engagement.findings);

    // Prefer sectionOverride for executive summary if present, else specific override, else generated
    const executiveSummaryText = config.sectionOverrides?.['executiveSummary'] || config.executiveSummaryOverride || generateExecutiveSummary(
        engagement.findings,
        engagement.metadata.assessmentType,
        client.companyName
    );

    const conclusion = config.conclusionOverride || undefined;

    // Helper for rendering Standard Sections
    const renderStandardSection = (section: ReportSection) => {
        switch (section.id) {
            case 'coverPage':
                const coverDefaults = effectiveBranding.coverSettings;
                const coverProps = {
                    assessmentType: config.coverOverride?.title ?? (coverDefaults?.title || engagement.metadata.assessmentType),
                    clientName: config.coverOverride?.subtitle ?? (coverDefaults?.subtitle || client.companyName),
                    engagementName: engagement.metadata.engagementName,
                    dateRange: config.coverOverride?.dateText ?? (coverDefaults?.dateText || formatDateRange(engagement.metadata.startDate, engagement.metadata.endDate)),
                    providerName: provider.companyName,
                    providerContact: provider.contactEmail,
                    providerWebsite: provider.website,
                    clientLogoUrl: (config.coverOverride?.showClientLogo ?? coverDefaults?.showClientLogo ?? false) ? effectiveBranding.clientLogoUrl : undefined,
                    providerLogoUrl: (config.coverOverride?.showProviderLogo ?? coverDefaults?.showProviderLogo ?? false) ? effectiveBranding.providerLogoUrl : undefined,
                };

                // Check if enhanced cover is enabled
                if (effectiveBranding?.useEnhancedCover) {
                    return (
                        <div key={section.id}>
                            <EnhancedCover {...coverProps} />
                        </div>
                    );
                }

                // Default standard cover
                return (
                    <div key={section.id} className="page-break-after mb-20 text-center">
                        <div className="mb-12 mt-32">
                            <h1 className="mb-6 text-3xl font-semibold text-gray-900">{coverProps.assessmentType}</h1>
                            <h2 className="text-2xl font-medium text-gray-700">{coverProps.clientName}</h2>
                        </div>
                        <div className="mb-12 mt-20">
                            <p className="text-lg font-medium text-gray-800">{coverProps.engagementName}</p>
                            <p className="mt-3 text-sm text-gray-600">
                                {coverProps.dateRange}
                            </p>
                        </div>
                        <div className="mt-24 border-t border-gray-200 pt-12">
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-6 text-xl font-semibold text-gray-900">Confidentiality Notice</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-6 text-xl font-semibold text-gray-900">Confidentiality Notice</h2>
                        <div className="rounded border border-gray-200 bg-gray-50 p-8">
                            <p className="text-sm leading-loose text-gray-700">{provider.legalDisclaimer}</p>
                        </div>
                    </div>
                );

            case 'executiveSummary':
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-16">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Executive Summary</h2>
                        <div className="mb-10 whitespace-pre-line leading-loose text-gray-700">
                            {executiveSummaryText}
                        </div>

                        <div className="mt-12">
                            <h3 className="mb-6 text-lg font-medium text-gray-900">Risk Profile</h3>

                            {/* Visual Charts Integration */}
                            {(effectiveBranding?.showChartsInExecutiveSummary || effectiveBranding?.showRiskMatrix) && (
                                <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 print:grid-cols-2">
                                    {effectiveBranding?.showChartsInExecutiveSummary && (
                                        <>
                                            <SeverityChart findings={engagement.findings} />
                                            <CategoryChart findings={engagement.findings} />
                                        </>
                                    )}
                                    {effectiveBranding?.showRiskMatrix && (
                                        <div className="col-span-1 lg:col-span-2 print:col-span-2 flex justify-center mt-4">
                                            <RiskMatrix findings={engagement.findings} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Standard Risk Stats Grid (always show as data foundation) */}
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
                    <div key={section.id} className="page-break-before mt-16 mb-16">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Historical Comparison</h2>
                        <HistoricalComparison currentEngagement={engagement} />
                    </div>
                );

            case 'teamMembers':
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Engagement Team</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                if (!config.teamMembers || config.teamMembers.length === 0) return null;
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Engagement Team</h2>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="pb-3 font-medium text-gray-900">Name</th>
                                    <th className="pb-3 font-medium text-gray-900">Role</th>
                                    <th className="pb-3 font-medium text-gray-900">Qualifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                {config.teamMembers.map((member, i) => (
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Scope and Methodology</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Scope and Methodology</h2>

                        <h3 className="mb-3 text-lg font-medium text-gray-900">Testing Methodology</h3>
                        <p className="mb-8 leading-loose text-gray-700">{engagement.metadata.testingMethodology}</p>

                        <h3 className="mb-3 text-lg font-medium text-gray-900">Assessment Period</h3>
                        <p className="mb-8 leading-loose text-gray-700">
                            {formatDateRange(engagement.metadata.startDate, engagement.metadata.endDate)}
                        </p>

                        {engagement.metadata.scope.length > 0 && (
                            <>
                                <h3 className="mb-3 text-lg font-medium text-gray-900">In Scope</h3>
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
                                <h3 className="mb-3 text-lg font-medium text-gray-900">Out of Scope</h3>
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
                                <h3 className="mb-3 text-lg font-medium text-gray-900">Assumptions</h3>
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
                                <h3 className="mb-3 text-lg font-medium text-gray-900">Limitations</h3>
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Risk Rating Explanation</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Risk Rating Explanation</h2>
                        <div className="space-y-6">
                            {['Critical', 'High', 'Medium', 'Low', 'Informational'].map((sev) => (
                                <div key={sev} className="border-l-2 border-gray-200 pl-6">
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Findings Summary</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                if (sortedFindings.length === 0) return null;
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Findings Summary</h2>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="pb-3 font-medium text-gray-900">#</th>
                                    <th className="pb-3 font-medium text-gray-900">Title</th>
                                    <th className="pb-3 font-medium text-gray-900">Severity</th>
                                    {template.includeCVSS && (
                                        <th className="pb-3 font-medium text-gray-900">CVSS</th>
                                    )}
                                    <th className="pb-3 font-medium text-gray-900">Category</th>
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-10 text-xl font-semibold text-gray-900">Detailed Findings</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                if (sortedFindings.length === 0) return null;
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-10 text-xl font-semibold text-gray-900">Detailed Findings</h2>
                        {sortedFindings.map((finding, index) => (
                            <div key={finding.id} className="mb-12 border-l-2 border-gray-200 pl-8">
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
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            {finding.evidenceFiles.map((file) => (
                                                <div key={file.id} className="bg-white">
                                                    {file.type.startsWith('image/') ? (
                                                        <div className="mb-2">
                                                            <img
                                                                src={file.data}
                                                                alt={file.name}
                                                                className="max-h-64 mx-auto object-contain shadow-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-32 items-center justify-center bg-gray-50 text-3xl">
                                                            {file.type === 'application/pdf' ? '📄' : '📎'}
                                                        </div>
                                                    )}
                                                    <p className="text-center text-xs text-gray-600 truncate mt-2">{file.name}</p>
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
                // Check for override first
                if (config.sectionOverrides?.[section.id]) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Recommendations</h2>
                            <MarkdownRenderer
                                content={config.sectionOverrides[section.id]}
                                variant="report"
                            />
                        </div>
                    );
                }
                // Default content
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Recommendations</h2>
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
                // Check for override first (check both new and legacy override fields)
                const conclusionContent = config.sectionOverrides?.[section.id] || conclusion;

                if (conclusionContent) {
                    return (
                        <div key={section.id} className="page-break-before mt-16 mb-12">
                            <h2 className="mb-8 text-xl font-semibold text-gray-900">Conclusion</h2>
                            <div className="leading-loose text-gray-700 whitespace-pre-line space-y-4">
                                {conclusionContent}
                            </div>
                        </div>
                    );
                }

                // Default content
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        <h2 className="mb-8 text-xl font-semibold text-gray-900">Conclusion</h2>
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
                // Fallback for custom sections or unknown types
                // We use MarkdownRenderer to render the content with full image support
                const content = config.sectionOverrides?.[section.id] || section.content || '';
                return (
                    <div key={section.id} className="page-break-before mt-16 mb-12">
                        {/* Only render title if it's not empty, serves as section header */}
                        {section.title && <h2 className="mb-6 text-xl font-semibold text-gray-900">{section.title}</h2>}
                        <MarkdownRenderer
                            content={content}
                            variant="report"
                        />
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:p-0">
            {/* Toolbar - Actions */}
            <div className="mb-8 flex items-center justify-between px-8 print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Engagement
                </Button>
                <div className="flex gap-4">
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print Report / Save PDF
                    </Button>
                </div>
            </div>

            {/* Report Content */}
            <div className={`report-content mx-auto max-w-[850px] bg-white px-20 py-16 text-black ${spacingClass} ${fontClass}`}>
                {sectionsToRender.map((section) => {
                    if (!section.isVisible) return null;
                    return renderStandardSection(section);
                })}
                <div className="mt-20 border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
                    Generated by OkAxis • OkynusTech
                </div>
            </div>
        </div>
    );
}
