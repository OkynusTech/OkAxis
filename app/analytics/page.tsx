'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAllClients, getAllApplications } from '@/lib/storage';
import { AnalyticsService } from '@/lib/analytics-service';
import { VulnerabilityTrendChart } from '@/components/analytics/vulnerability-trend-chart';
import { RiskHeatmap } from '@/components/analytics/risk-heatmap';
import { RiskScoreGauge } from '@/components/analytics/risk-score-gauge';
import { PortfolioSummaryCards } from '@/components/analytics/portfolio-summary-cards';

type TimeRange = 30 | 90 | 365 | 'all';

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>(90);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [selectedApplication, setSelectedApplication] = useState<string>('all');

    const [portfolioMetrics, setPortfolioMetrics] = useState(AnalyticsService.getPortfolioOverview());
    const [trendData, setTrendData] = useState(AnalyticsService.calculateVulnerabilityTrends('portfolio', undefined, timeRange));
    const [heatmapData, setHeatmapData] = useState(AnalyticsService.generateRiskHeatmap());
    const [clientScores, setClientScores] = useState<any[]>([]);

    const clients = getAllClients();
    const applications = getAllApplications();

    useEffect(() => {
        refreshData();
    }, [timeRange, selectedClient, selectedApplication]);

    const refreshData = () => {
        // Portfolio overview
        setPortfolioMetrics(AnalyticsService.getPortfolioOverview());

        // Trend data based on filters
        if (selectedApplication !== 'all') {
            setTrendData(AnalyticsService.calculateVulnerabilityTrends('application', selectedApplication, timeRange));
        } else if (selectedClient !== 'all') {
            setTrendData(AnalyticsService.calculateVulnerabilityTrends('client', selectedClient, timeRange));
        } else {
            setTrendData(AnalyticsService.calculateVulnerabilityTrends('portfolio', undefined, timeRange));
        }

        // Heatmap (always show all apps)
        setHeatmapData(AnalyticsService.generateRiskHeatmap());

        // Client risk scores
        const scores = clients.map(c => AnalyticsService.calculateClientRiskScore(c.id));
        setClientScores(scores.sort((a, b) => b.overallScore - a.overallScore));
    };

    const handleExportPDF = () => {
        // Placeholder for PDF export functionality
        alert('PDF export feature coming soon!');
    };

    const getTrendTitle = () => {
        if (selectedApplication !== 'all') {
            const app = applications.find(a => a.id === selectedApplication);
            return `Vulnerability Trends - ${app?.name || 'Application'}`;
        }
        if (selectedClient !== 'all') {
            const client = clients.find(c => c.id === selectedClient);
            return `Vulnerability Trends - ${client?.companyName || 'Client'}`;
        }
        return 'Portfolio Vulnerability Trends';
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-bold">Executive Insights</h1>
                        <p className="mt-1 text-muted-foreground">
                            AI-powered analytics and risk intelligence
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleExportPDF}>
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>

                {/* Filters */}
                <Card className="mb-8 p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Time Range Filter */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Time Range:</span>
                            <div className="flex gap-1">
                                {[
                                    { value: 30 as TimeRange, label: '30d' },
                                    { value: 90 as TimeRange, label: '90d' },
                                    { value: 365 as TimeRange, label: '1y' },
                                    { value: 'all' as TimeRange, label: 'All' },
                                ].map(option => (
                                    <Button
                                        key={option.value}
                                        variant={timeRange === option.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTimeRange(option.value)}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="h-6 w-px bg-border" />

                        {/* Client Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Client:</span>
                            <select
                                value={selectedClient}
                                onChange={(e) => {
                                    setSelectedClient(e.target.value);
                                    setSelectedApplication('all');
                                }}
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="all">All Clients</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Application Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Application:</span>
                            <select
                                value={selectedApplication}
                                onChange={(e) => setSelectedApplication(e.target.value)}
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                disabled={selectedClient === 'all'}
                            >
                                <option value="all">All Applications</option>
                                {applications
                                    .filter(a => selectedClient === 'all' || a.clientId === selectedClient)
                                    .map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Portfolio Summary KPIs */}
                <div className="mb-8">
                    <PortfolioSummaryCards metrics={portfolioMetrics} />
                </div>

                {/* Vulnerability Trend Chart */}
                <div className="mb-8">
                    <VulnerabilityTrendChart data={trendData} title={getTrendTitle()} chartType="area" />
                </div>

                {/* Risk Heatmap */}
                <div className="mb-8">
                    <RiskHeatmap data={heatmapData} />
                </div>

                {/* Client Risk Scores */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-6">Client Risk Assessment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {clientScores.map(score => (
                            <Link key={score.clientId} href={`/clients/${score.clientId}`}>
                                <div className="cursor-pointer transition-all hover:scale-105">
                                    <RiskScoreGauge
                                        score={score.overallScore}
                                        label={score.clientName}
                                        size="sm"
                                    />
                                    <div className="mt-2 text-xs text-center text-muted-foreground">
                                        {score.lastAssessmentDate && `Last: ${new Date(score.lastAssessmentDate).toLocaleDateString()}`}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
