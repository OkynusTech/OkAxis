'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ShieldAlert,
    FileText,
    CheckCircle,
    Clock,
    ArrowRight,
    Download,
    Sparkles,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    getAllEngagements,
    getClientUsers,
    getAllClients,
    getAllApplications
} from '@/lib/storage';
import { Engagement, ClientUser } from '@/lib/types';
import { formatDate } from '@/lib/report-utils';
import { generateClientSummaryAction } from '@/app/actions/ai-actions';

export default function PortalDashboard() {
    const [user, setUser] = useState<ClientUser | null>(null);
    const [stats, setStats] = useState({
        reportsCount: 0,
        openCriticals: 0,
        openHighs: 0,
        activeEngagements: 0
    });
    const [recentEngagements, setRecentEngagements] = useState<Engagement[]>([]);

    // AI Summary State
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    useEffect(() => {
        const storedUserId = localStorage.getItem('ok_portal_user_id');
        if (!storedUserId) return;

        // Find user again (in a real app, this would be passed via Context)
        const clients = getAllClients();
        let foundUser: ClientUser | undefined;
        for (const client of clients) {
            const users = getClientUsers(client.id);
            foundUser = users.find(u => u.id === storedUserId);
            if (foundUser) break;
        }

        if (foundUser) {
            setUser(foundUser);
            loadDashboardData(foundUser.clientId);
        }
    }, []);

    const loadDashboardData = (clientId: string) => {
        const allEngagements = getAllEngagements().filter(e => e.clientId === clientId);

        // Filter for "Client Visible" engagements
        // FIX: Showing all engagements including Drafts for MVP demo visibility
        const visibleEngagements = allEngagements;

        let criticals = 0;
        let highs = 0;

        visibleEngagements.forEach(eng => {
            eng.findings.forEach(f => {
                if (['Open', 'In Progress'].includes(f.status)) {
                    if (f.severity === 'Critical') criticals++;
                    if (f.severity === 'High') highs++;
                }
            });
        });

        setStats({
            reportsCount: visibleEngagements.filter(e => ['Completed', 'Delivered'].includes(e.status)).length,
            activeEngagements: visibleEngagements.filter(e => ['In Progress', 'Review'].includes(e.status)).length,
            openCriticals: criticals,
            openHighs: highs
        });

        // Sort by date desc
        visibleEngagements.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setRecentEngagements(visibleEngagements.slice(0, 3));
    };

    const handleGenerateSummary = async () => {
        if (!user) return;
        setIsGeneratingSummary(true);

        // Gather context
        const allEngagements = getAllEngagements().filter(e => e.clientId === user.clientId);
        const findingsContext: any[] = [];
        allEngagements.forEach(eng => {
            eng.findings.forEach(f => {
                if (['Open', 'In Progress'].includes(f.status)) {
                    findingsContext.push({
                        title: f.title,
                        severity: f.severity,
                        description: f.description,
                        status: f.status
                    });
                }
            });
        });

        const client = getAllClients().find(c => c.id === user.clientId);
        const summary = await generateClientSummaryAction(user.clientId, client?.companyName || 'Client', findingsContext);

        setAiSummary(summary);
        setIsGeneratingSummary(false);
    };

    if (!user) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
                <p className="text-slate-400 mt-2">
                    Welcome back, {user.name}. Here is your security posture overview.
                </p>
            </div>

            {/* AI Executive Summary Widget */}
            <Card className="p-6 bg-slate-900 border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="h-32 w-32 text-blue-500" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-50">AI Executive Summary</h2>
                    </div>

                    {!aiSummary ? (
                        <div className="text-center py-6">
                            <p className="text-slate-400 mb-4 text-sm max-w-lg mx-auto">
                                Generate a business-focused summary of your current security posture, strictly tailored for executive stakeholders.
                            </p>
                            <Button
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Analysis...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Business Summary
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-slate-950/50 rounded-lg p-6 border border-slate-800">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                    {aiSummary}
                                </p>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleGenerateSummary}
                                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                    Regenerate
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-l-red-500 shadow-sm bg-slate-900 border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Open Critical Risks</p>
                            <p className="text-3xl font-bold text-slate-50 mt-2">{stats.openCriticals}</p>
                        </div>
                        <div className="h-12 w-12 bg-red-900/20 rounded-full flex items-center justify-center">
                            <ShieldAlert className="h-6 w-6 text-red-500" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-orange-500 shadow-sm bg-slate-900 border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Open High Risks</p>
                            <p className="text-3xl font-bold text-slate-50 mt-2">{stats.openHighs}</p>
                        </div>
                        <div className="h-12 w-12 bg-orange-900/20 rounded-full flex items-center justify-center">
                            <ShieldAlert className="h-6 w-6 text-orange-500" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm bg-slate-900 border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Active Assessments</p>
                            <p className="text-3xl font-bold text-slate-50 mt-2">{stats.activeEngagements}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-900/20 rounded-full flex items-center justify-center">
                            <Clock className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-500 shadow-sm bg-slate-900 border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Finalized Reports</p>
                            <p className="text-3xl font-bold text-slate-50 mt-2">{stats.reportsCount}</p>
                        </div>
                        <div className="h-12 w-12 bg-green-900/20 rounded-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-green-500" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Assessments */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-50">Recent Assessments</h2>
                    <Link href="/portal/reports" className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center">
                        View all reports <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                </div>

                <div className="space-y-4">
                    {recentEngagements.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-900 border-dashed border-slate-700">
                            <p className="text-slate-400">No assessments found.</p>
                        </Card>
                    ) : (
                        recentEngagements.map(eng => (
                            <Card key={eng.id} className="p-6 transition-all hover:bg-slate-800/50 bg-slate-900 border-slate-800">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-slate-50">
                                                {eng.metadata.engagementName}
                                            </h3>
                                            <Badge variant={
                                                eng.status === 'Completed' || eng.status === 'Delivered' ? 'default' :
                                                    eng.status === 'In Progress' ? 'secondary' : 'outline'
                                            } className={eng.status === 'Draft' ? 'text-slate-400 border-slate-600' : ''}>
                                                {eng.status}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1">
                                            {eng.metadata.assessmentType} • {formatDate(eng.metadata.startDate)} - {formatDate(eng.metadata.endDate)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right mr-4 hidden md:block">
                                            <div className="text-sm font-medium text-slate-200">
                                                {eng.findings.length} findings
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Updated {formatDate(eng.updatedAt)}
                                            </div>
                                        </div>
                                        <Link href={`/engagement/${eng.id}/report?view=client`}>
                                            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600">
                                                <FileText className="mr-2 h-4 w-4" />
                                                View Report
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
