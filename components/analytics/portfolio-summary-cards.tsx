import React from 'react';
import { PortfolioMetrics } from '@/lib/analytics-service';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, FileText, Building2 } from 'lucide-react';

interface PortfolioSummaryCardsProps {
    metrics: PortfolioMetrics;
}

export function PortfolioSummaryCards({ metrics }: PortfolioSummaryCardsProps) {
    const getTrendIcon = () => {
        switch (metrics.trendDirection) {
            case 'improving':
                return <TrendingDown className="h-5 w-5 text-green-600" />;
            case 'degrading':
                return <TrendingUp className="h-5 w-5 text-red-600" />;
            default:
                return <Minus className="h-5 w-5 text-gray-600" />;
        }
    };

    const getTrendText = () => {
        switch (metrics.trendDirection) {
            case 'improving':
                return <span className="text-green-600">Improving</span>;
            case 'degrading':
                return <span className="text-red-600">Needs Attention</span>;
            default:
                return <span className="text-gray-600">Stable</span>;
        }
    };

    const getRiskScoreColor = (score: number) => {
        if (score >= 75) return 'text-red-600';
        if (score >= 50) return 'text-orange-600';
        if (score >= 25) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Portfolio Overview */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Portfolio Overview</p>
                        <div className="mt-3 space-y-1">
                            <div className="flex items-center text-2xl font-bold">
                                {metrics.totalClients}
                                <Building2 className="ml-2 h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">Clients</p>
                            <p className="text-xs text-muted-foreground">{metrics.totalApplications} Applications</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Average Risk Score */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Avg. Risk Score</p>
                        <div className="mt-3">
                            <div className={`text-3xl font-bold ${getRiskScoreColor(metrics.averageRiskScore)}`}>
                                {metrics.averageRiskScore}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {metrics.highRiskClients} high-risk client{metrics.highRiskClients !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <Shield className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
            </Card>

            {/* Critical Findings */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Critical Findings</p>
                        <div className="mt-3">
                            <div className="text-3xl font-bold text-red-600">
                                {metrics.criticalFindingsOpen}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across {metrics.totalEngagements} engagement{metrics.totalEngagements !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600 opacity-20" />
                </div>
            </Card>

            {/* Security Trend */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Security Trend</p>
                        <div className="mt-3">
                            <div className="flex items-center gap-2 text-xl font-bold">
                                {getTrendIcon()}
                                {getTrendText()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Last 30 days
                            </p>
                        </div>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
            </Card>
        </div>
    );
}
