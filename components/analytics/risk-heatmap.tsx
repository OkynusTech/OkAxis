import React from 'react';
import { RiskHeatmapCell } from '@/lib/analytics-service';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface RiskHeatmapProps {
    data: RiskHeatmapCell[];
    title?: string;
}

export function RiskHeatmap({ data, title = 'Application Risk Heatmap' }: RiskHeatmapProps) {
    if (data.length === 0) {
        return (
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <p className="text-muted-foreground text-center py-12">No applications to display</p>
            </Card>
        );
    }

    // Helper to get color based on risk score
    const getRiskColor = (score: number): string => {
        if (score >= 75) return 'from-red-600 to-red-700';
        if (score >= 50) return 'from-orange-500 to-orange-600';
        if (score >= 25) return 'from-yellow-500 to-yellow-600';
        return 'from-green-500 to-green-600';
    };

    const getRiskTextColor = (score: number): string => {
        if (score >= 75) return 'text-red-600';
        if (score >= 50) return 'text-orange-600';
        if (score >= 25) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getRiskLabel = (score: number): string => {
        if (score >= 75) return 'Critical Risk';
        if (score >= 50) return 'High Risk';
        if (score >= 25) return 'Medium Risk';
        return 'Low Risk';
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.map((cell) => (
                    <Link
                        key={cell.applicationId}
                        href={`/applications/${cell.applicationId}`}
                        className="block"
                    >
                        <div className="group relative p-4 border rounded-lg transition-all hover:shadow-lg hover:border-blue-500 cursor-pointer bg-card">
                            {/* Risk Score Badge */}
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-md bg-gradient-to-r ${getRiskColor(cell.riskScore)} text-white text-xs font-bold`}>
                                {cell.riskScore}
                            </div>

                            {/* Application Info */}
                            <div className="pr-12">
                                <h4 className="font-semibold text-sm line-clamp-1" title={cell.applicationName}>
                                    {cell.applicationName}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {cell.clientName}
                                </p>
                            </div>

                            {/* Risk Metrics */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Critical</span>
                                    <span className="font-semibold text-red-600">{cell.criticalCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">High</span>
                                    <span className="font-semibold text-orange-600">{cell.highCount}</span>
                                </div>
                                <div className={`text-xs font-medium ${getRiskTextColor(cell.riskScore)} mt-2 pt-2 border-t`}>
                                    {getRiskLabel(cell.riskScore)}
                                </div>
                            </div>

                            {/* Last Assessment Date */}
                            {cell.lastAssessment && (
                                <div className="mt-3 text-xs text-muted-foreground">
                                    Last: {new Date(cell.lastAssessment).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
}
