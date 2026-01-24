import React from 'react';
import { AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getHistoricalContext, getEngineerRecommendations } from '@/lib/engagement-history';
import { formatDate, calculateFindingStats } from '@/lib/report-utils';
import { getAllEngagements } from '@/lib/storage';

interface HistoricalContextPanelProps {
    applicationId: string;
}

export function HistoricalContextPanel({ applicationId }: HistoricalContextPanelProps) {
    const context = getHistoricalContext(applicationId);
    const recommendations = getEngineerRecommendations(applicationId);
    const allEngagements = getAllEngagements();

    if (context.totalPreviousEngagements === 0) {
        return (
            <Card className="p-4 border-blue-600 bg-blue-600/5">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-600">New Application Assessment</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            This is the first engagement for this application. No historical context available yet.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card className="p-4 border-orange-600 bg-orange-600/5">
                <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-orange-600">Historical Context Available</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            This application has been assessed {context.totalPreviousEngagements} time{context.totalPreviousEngagements > 1 ? 's' : ''} before.
                            Historical findings and patterns are available for reference.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-700">Total Historical Findings:</span>
                                <span className="ml-2 font-medium">{context.pastFindings.length}</span>
                            </div>
                            {context.recurringVulnerabilityClasses.length > 0 && (
                                <div>
                                    <span className="text-gray-700">Recurring Issues:</span>
                                    <span className="ml-2 font-medium text-red-600">
                                        {context.recurringVulnerabilityClasses.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Recurring Issues Warning */}
            {context.recurringVulnerabilityClasses.length > 0 && (
                <Card className="p-4 border-red-600 bg-red-600/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-600">Recurring Vulnerability Classes Detected</h3>
                            <p className="text-sm text-gray-600 mt-1 mb-3">
                                These vulnerability classes have appeared in multiple previous engagements:
                            </p>
                            <div className="space-y-2">
                                {context.recurringVulnerabilityClasses.slice(0, 5).map((pattern, idx) => (
                                    <div key={idx} className="text-sm">
                                        <span className="font-medium">{pattern.className}</span>
                                        <span className="text-gray-700">
                                            {' '}• {pattern.occurrences} occurrences across {pattern.engagementIds.length} engagements
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* High Risk Areas */}
            {context.highRiskAreas.length > 0 && (
                <Card className="p-4">
                    <h4 className="font-semibold mb-2">Historical High-Risk Areas</h4>
                    <p className="text-sm text-gray-600 mb-3">
                        These components/endpoints had multiple findings in previous assessments:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {context.highRiskAreas.map((area, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-orange-600/10 px-3 py-1 text-sm font-medium text-orange-600"
                            >
                                {area}
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {/* Engineer Recommendations */}
            {recommendations.length > 0 && (
                <Card className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <h4 className="font-semibold">Recommended Engineers</h4>
                            <p className="text-xs text-gray-600 mt-1">
                                Based on previous engagement involvement (not skill rankings)
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {recommendations.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 border rounded">
                                <div>
                                    <p className="font-medium">{rec.engineer.name}</p>
                                    <p className="text-xs text-gray-600">{rec.engineer.role}</p>
                                </div>
                                <p className="text-xs text-gray-600">{rec.reason}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Previous Engagements */}
            <Card className="p-4">
                <h4 className="font-semibold mb-3">Previous Engagements</h4>
                <div className="space-y-2">
                    {context.previousEngagements.slice(0, 3).map((engagement) => {
                        const stats = calculateFindingStats(engagement.findings);
                        return (
                            <div key={engagement.id} className="text-sm p-2 border rounded">
                                <p className="font-medium">{engagement.metadata.engagementName}</p>
                                <p className="text-xs text-gray-600">
                                    {formatDate(engagement.metadata.startDate)} • {stats.total} findings
                                </p>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
