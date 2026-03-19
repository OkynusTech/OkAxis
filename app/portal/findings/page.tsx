'use client';

import { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Search,
    Filter,
    ChevronDown,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getAllEngagements,
    getClientUsers,
    getAllClients
} from '@/lib/storage';
import { Engagement, ClientUser, Finding } from '@/lib/types';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/report-utils';
import { explainFindingAction } from '@/app/actions/ai-actions';
import { MessageSquare, Bot, Sparkles, Loader2, History, CheckSquare, RefreshCw } from 'lucide-react';
import { RemediationHistoryPanel } from '@/components/remediation/remediation-history-panel';
import { Separator } from '@/components/ui/separator';
import { RequestRetestDialog } from '@/components/forms/request-retest-dialog';
import { AutoRetestDialog } from '@/components/forms/auto-retest-dialog';
import { Zap } from 'lucide-react';

export default function PortalFindings() {
    const [user, setUser] = useState<ClientUser | null>(null);
    const [findings, setFindings] = useState<(Finding & { engagementName: string, engagementId: string })[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [engagementFilter, setEngagementFilter] = useState<string>('all');
    const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

    // AI Explanation State
    const [explanations, setExplanations] = useState<Record<string, string>>({});
    const [isExplaining, setIsExplaining] = useState<Record<string, boolean>>({});

    // Retest Request Dialog State
    const [retestDialogOpen, setRetestDialogOpen] = useState(false);
    const [selectedFinding, setSelectedFinding] = useState<(Finding & { engagementId: string }) | null>(null);

    // Auto-Retest Dialog State
    const [autoRetestOpen, setAutoRetestOpen] = useState(false);
    const [autoRetestFinding, setAutoRetestFinding] = useState<(Finding & { engagementId: string }) | null>(null);

    // Derived state for engagement filter options
    const uniqueEngagements = Array.from(new Set(findings.map(f => f.engagementId)))
        .map(id => {
            const finding = findings.find(f => f.engagementId === id);
            return { id, name: finding?.engagementName || 'Unknown Engagement' };
        });

    useEffect(() => {
        const storedUserId = localStorage.getItem('ok_portal_user_id');
        if (!storedUserId) return;

        const clients = getAllClients();
        let foundUser: ClientUser | undefined;
        for (const client of clients) {
            const users = getClientUsers(client.id);
            foundUser = users.find(u => u.id === storedUserId);
            if (foundUser) break;
        }

        if (foundUser) {
            setUser(foundUser);

            // Gather all findings from all engagements
            const allEngagements = getAllEngagements().filter(e => e.clientId === foundUser?.clientId);
            const allFindings: (Finding & { engagementName: string, engagementId: string })[] = [];

            allEngagements.forEach(eng => {
                eng.findings.forEach(f => {
                    allFindings.push({
                        ...f,
                        engagementName: eng.metadata.engagementName,
                        engagementId: eng.id
                    });
                });
            });

            // Sort by severity (Critical first) then date
            setFindings(allFindings.sort((a, b) => {
                const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Informational': 4 };
                const scoreA = severityOrder[a.severity] || 99;
                const scoreB = severityOrder[b.severity] || 99;
                if (scoreA !== scoreB) return scoreA - scoreB;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }));
        }
    }, []);

    const filteredFindings = findings.filter(f => {
        const matchesSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
        const matchesEngagement = engagementFilter === 'all' || f.engagementId === engagementFilter;
        return matchesSearch && matchesStatus && matchesSeverity && matchesEngagement;
    });

    const handleRequestRetest = (findingId: string) => {
        alert(`Retest request submitted for finding ${findingId}. An engineer will be notified.`);
        // In a real app, this would create a 'RetestRequest' task or notification
    };

    const handleAskAI = async (finding: any, type: 'business' | 'fix') => {
        setIsExplaining(prev => ({ ...prev, [finding.id]: true }));
        const response = await explainFindingAction(finding, type);
        setExplanations(prev => ({ ...prev, [finding.id]: response }));
        setIsExplaining(prev => ({ ...prev, [finding.id]: false }));
    };

    if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-50">Findings Explorer</h1>
                <p className="text-slate-400 mt-1">
                    Interactive view of all security findings across your engagements.
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-slate-900 border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search findings (CVE, title, description)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-950 border-slate-700 text-slate-50 placeholder:text-slate-500"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-50">
                                <SelectValue placeholder="All Engagements" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-50">
                                <SelectItem value="all">All Engagements</SelectItem>
                                {uniqueEngagements.map(e => (
                                    <SelectItem key={e.id} value={e.id} className="focus:bg-slate-800 focus:text-slate-50">{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-50">
                                <SelectValue placeholder="All Severities" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-50">
                                <SelectItem value="all">All Severities</SelectItem>
                                <SelectItem value="Critical" className="focus:bg-slate-800 focus:text-slate-50">Critical</SelectItem>
                                <SelectItem value="High" className="focus:bg-slate-800 focus:text-slate-50">High</SelectItem>
                                <SelectItem value="Medium" className="focus:bg-slate-800 focus:text-slate-50">Medium</SelectItem>
                                <SelectItem value="Low" className="focus:bg-slate-800 focus:text-slate-50">Low</SelectItem>
                                <SelectItem value="Informational" className="focus:bg-slate-800 focus:text-slate-50">Informational</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-50">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-50">
                                <SelectItem value="all" className="focus:bg-slate-800 focus:text-slate-50">All Statuses</SelectItem>
                                <SelectItem value="Open" className="focus:bg-slate-800 focus:text-slate-50">Open</SelectItem>
                                <SelectItem value="In Progress" className="focus:bg-slate-800 focus:text-slate-50">In Progress</SelectItem>
                                <SelectItem value="Resolved" className="focus:bg-slate-800 focus:text-slate-50">Resolved</SelectItem>
                                <SelectItem value="Accepted Risk" className="focus:bg-slate-800 focus:text-slate-50">Accepted Risk</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Findings List */}
            <div className="space-y-4">
                {filteredFindings.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground bg-slate-900 border-slate-800">
                        <ShieldAlert className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                        <p className="text-slate-400">No findings match your criteria.</p>
                    </Card>
                ) : (
                    filteredFindings.map(finding => (
                        <Card key={finding.id} className="overflow-hidden transition-all hover:bg-slate-800/50 bg-slate-900 border-slate-800">
                            <div
                                className="p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-800/30"
                                onClick={() => setExpandedFindingId(expandedFindingId === finding.id ? null : finding.id)}
                            >
                                <div className="mt-1">
                                    {expandedFindingId === finding.id ? (
                                        <ChevronDown className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5 text-slate-500" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-base font-medium text-slate-50 truncate pr-4">
                                                {finding.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                                                <span>{finding.engagementName}</span>
                                                <span>•</span>
                                                <span>{formatDate(finding.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <SeverityBadge severity={finding.severity} className="text-xs" />
                                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                                {finding.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Detail View */}
                            {expandedFindingId === finding.id && (
                                <div className="p-6 pt-0 border-t border-slate-800 bg-slate-950/30">
                                    <div className="grid md:grid-cols-2 gap-8 mt-4">
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</h4>
                                                <div className="text-sm text-slate-400 whitespace-pre-wrap">{finding.description}</div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Impact</h4>
                                                <div className="text-sm text-slate-400 whitespace-pre-wrap">{finding.impact}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Remediation</h4>
                                                <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs">
                                                    {finding.remediation}
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex flex-col gap-4 pt-4 mt-4 border-t border-slate-800">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedFinding(finding);
                                                            setRetestDialogOpen(true);
                                                        }}
                                                    >
                                                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                                        Request Re-test
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-violet-600 hover:bg-violet-700 text-white"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAutoRetestFinding(finding);
                                                            setAutoRetestOpen(true);
                                                        }}
                                                    >
                                                        <Zap className="mr-2 h-3.5 w-3.5" />
                                                        Auto-Verify Fix
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                                                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                        Share Artifact
                                                    </Button>

                                                    <div className="h-6 w-px bg-slate-700 mx-2" />

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAskAI(finding, 'business');
                                                        }}
                                                        disabled={isExplaining[finding.id]}
                                                    >
                                                        {isExplaining[finding.id] ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                                                        Explain Impact
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAskAI(finding, 'fix');
                                                        }}
                                                        disabled={isExplaining[finding.id]}
                                                    >
                                                        <Bot className="mr-2 h-3.5 w-3.5" />
                                                        How to Fix?
                                                    </Button>
                                                </div>

                                                {/* AI Explanation Result */}
                                                {explanations[finding.id] && (
                                                    <div className="mt-2 p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-1.5 bg-indigo-500/20 rounded-md">
                                                                <Bot className="h-4 w-4 text-indigo-400" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-medium text-indigo-300">AI Explanation</h4>
                                                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                                    {explanations[finding.id]}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remediation History - Client View */}
                                    {finding.remediationHistory && finding.remediationHistory.length > 0 && user && (
                                        <>
                                            <Separator className="my-6" />
                                            <div className="mt-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <History className="h-5 w-5 text-slate-400" />
                                                    <h3 className="text-lg font-semibold text-slate-50">Fix Progress</h3>
                                                </div>
                                                <RemediationHistoryPanel
                                                    finding={finding}
                                                    clientId={user.clientId}
                                                    showSuggestions={false}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Request Retest Dialog */}
            {
                selectedFinding && user && (
                    <RequestRetestDialog
                        open={retestDialogOpen}
                        onOpenChange={setRetestDialogOpen}
                        finding={selectedFinding}
                        engagementId={selectedFinding.engagementId}
                        clientId={user.clientId}
                        currentUserId={user.id}
                        onSuccess={() => {
                            window.location.reload();
                        }}
                    />
                )
            }
            {/* Auto-Retest Dialog */}
            {autoRetestFinding && (
                <AutoRetestDialog
                    open={autoRetestOpen}
                    onOpenChange={(open) => {
                        setAutoRetestOpen(open);
                        if (!open) setAutoRetestFinding(null);
                    }}
                    finding={autoRetestFinding}
                    engagementId={autoRetestFinding.engagementId}
                />
            )}
        </div >
    );
}
