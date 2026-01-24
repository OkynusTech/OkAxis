'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Engagement } from '@/lib/types';
import { generateChangeReport, ChangeReport } from '@/lib/engagement-history';
import { History, ArrowRight, ShieldCheck, AlertTriangle, Info } from 'lucide-react';

interface HistoricalComparisonProps {
    currentEngagement: Engagement;
}

export function HistoricalComparison({ currentEngagement }: HistoricalComparisonProps) {
    const changeReport = generateChangeReport(currentEngagement);

    if (!changeReport) {
        return (
            <Card className="p-6 border-dashed">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Info className="h-5 w-5" />
                    <p>This is the first assessment for this application. Historical comparison will be available in subsequent engagements.</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="p-6 border-blue-600 bg-blue-600/5">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-600 p-3">
                        <History className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            Longitudinal Insights: Changes Since Last Assessment
                        </h3>
                        <p className="mt-1 text-blue-700 dark:text-blue-300">
                            {changeReport.summary}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Recurring Findings */}
            {changeReport.recurringFindings.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h4 className="text-lg font-bold">Recurring Findings</h4>
                    </div>
                    <div className="grid gap-4">
                        {changeReport.recurringFindings.map((item, idx) => (
                            <Card key={idx} className="p-4 border-orange-200 bg-orange-50/30">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <SeverityBadge severity={item.currentFinding.severity} />
                                        <div>
                                            <h5 className="font-semibold">{item.currentFinding.title}</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Recurring from: <span className="font-medium">{item.previousFinding.engagementName}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Fixed Findings */}
            {changeReport.fixedFindings.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <h4 className="text-lg font-bold">Remediated Since Last Assessment</h4>
                    </div>
                    <div className="grid gap-4">
                        {changeReport.fixedFindings.map((item, idx) => (
                            <Card key={idx} className="p-4 border-green-200 bg-green-50/30 opacity-75">
                                <div className="flex items-start gap-3">
                                    <SeverityBadge severity={item.finding.severity} />
                                    <div>
                                        <h5 className="font-semibold line-through text-muted-foreground">{item.finding.title}</h5>
                                        <p className="text-sm text-green-700 font-medium">Verified Fixed</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* New Findings */}
            {changeReport.newFindings.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowRight className="h-5 w-5 text-blue-600" />
                        <h4 className="text-lg font-bold">New Discoveries</h4>
                    </div>
                    <div className="grid gap-4">
                        {changeReport.newFindings.map((finding, idx) => (
                            <Card key={idx} className="p-4">
                                <div className="flex gap-3">
                                    <SeverityBadge severity={finding.severity} />
                                    <h5 className="font-semibold">{finding.title}</h5>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
