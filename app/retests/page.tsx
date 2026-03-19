'use client';

/**
 * Retest Queue Dashboard (Provider-Side)
 *
 * Tabs:
 *   Queue   — pending manual retest requests from clients
 *   History — all past auto-retest engine runs (global)
 */

import { useState, useEffect } from 'react';
import {
    getPendingRetestRequests,
    assignRetestRequest,
    completeRetestRequest,
    getAllEngineers,
    getEngagementById,
    getClient,
    getAllAutoRetestResults,
} from '@/lib/storage';
import { RetestRequest, Engineer, FindingStatus, AutoRetestResult } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    CheckCircle2, XCircle, Clock, User, Calendar, RefreshCw,
    AlertTriangle, Bot, History, ChevronDown, ChevronUp,
    Camera, FileText, Globe, Brain, Target, Layers,
} from 'lucide-react';
import { formatDate } from '@/lib/report-utils';
import { AutoRetestDialog } from '@/components/forms/auto-retest-dialog';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUEUE_STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    'pending':     { icon: Clock,       color: 'text-blue-600',   label: 'Pending' },
    'assigned':    { icon: User,        color: 'text-purple-600', label: 'Assigned' },
    'in-progress': { icon: RefreshCw,   color: 'text-yellow-600', label: 'In Progress' },
};

const HISTORY_STATUS_CONFIG = {
    verified:  { label: 'FIXED',         badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2, iconClass: 'text-emerald-600', dotClass: 'bg-emerald-100 dark:bg-emerald-900/30' },
    not_fixed: { label: 'NOT FIXED',     badgeClass: 'bg-red-100 text-red-700 border-red-300',             icon: XCircle,      iconClass: 'text-red-600',     dotClass: 'bg-red-100 dark:bg-red-900/30' },
    failed:    { label: 'INCONCLUSIVE',  badgeClass: 'bg-amber-100 text-amber-700 border-amber-300',       icon: AlertTriangle, iconClass: 'text-amber-600',   dotClass: 'bg-amber-100 dark:bg-amber-900/30' },
} as const;

const ACTION_ICONS: Record<string, string> = {
    navigate: '🌐', fill: '✏️', click: '👆', api_request: '📡', evaluate_js: '⚡', wait: '⏳',
};

type HistoryStatusFilter = 'all' | 'verified' | 'not_fixed' | 'failed';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RetestQueuePage() {
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

    // Queue state
    const [requests,         setRequests]         = useState<RetestRequest[]>([]);
    const [engineers,        setEngineers]         = useState<Engineer[]>([]);
    const [selectedRequest,  setSelectedRequest]   = useState<RetestRequest | null>(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [retestNotes,      setRetestNotes]       = useState('');
    const [newStatus,        setNewStatus]         = useState<FindingStatus>('Resolved');
    const [autoRetestOpen,   setAutoRetestOpen]    = useState(false);
    const [autoRetestRequest, setAutoRetestRequest] = useState<RetestRequest | null>(null);

    // History state
    const [historyResults,   setHistoryResults]   = useState<AutoRetestResult[]>([]);
    const [statusFilter,     setStatusFilter]      = useState<HistoryStatusFilter>('all');
    const [vulnSearch,       setVulnSearch]        = useState('');
    const [expandedId,       setExpandedId]        = useState<string | null>(null);
    const [showScreenshots,  setShowScreenshots]   = useState<Record<string, boolean>>({});
    const [selectedSS,       setSelectedSS]        = useState<Record<string, number | null>>({});
    const [showAgentSteps,   setShowAgentSteps]    = useState<Record<string, boolean>>({});
    const [showLogs,         setShowLogs]          = useState<Record<string, boolean>>({});
    const [showNetwork,      setShowNetwork]       = useState<Record<string, boolean>>({});

    useEffect(() => { loadData(); }, []);

    const loadData = () => {
        // Queue
        const allRequests = getPendingRetestRequests();
        const uniqueMap = new Map<string, RetestRequest>();
        allRequests.forEach(req => {
            const existing = uniqueMap.get(req.findingId);
            if (!existing || new Date(req.requestedAt) > new Date(existing.requestedAt)) {
                uniqueMap.set(req.findingId, req);
            }
        });
        setRequests(Array.from(uniqueMap.values()).sort((a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        ));
        setEngineers(getAllEngineers());

        // History
        setHistoryResults(getAllAutoRetestResults());
    };

    // ── Queue handlers ───────────────────────────────────────────────────────

    const handleAssign = (requestId: string, engineerId: string) => {
        assignRetestRequest(requestId, engineerId);
        loadData();
    };

    const handleCompleteClick = (request: RetestRequest) => {
        setSelectedRequest(request);
        setCompleteDialogOpen(true);
        setRetestNotes('');
        const engagement = getEngagementById(request.engagementId);
        const finding = engagement?.findings.find(f => f.id === request.findingId);
        setNewStatus(finding?.status === 'Resolved' ? 'Open' : 'Resolved');
    };

    const handleComplete = () => {
        if (!selectedRequest) return;
        completeRetestRequest(selectedRequest.id, 'eng_default', newStatus, retestNotes || undefined);
        setCompleteDialogOpen(false);
        setSelectedRequest(null);
        loadData();
    };

    const handleAutoRetestClick = (request: RetestRequest) => {
        setAutoRetestRequest(request);
        setAutoRetestOpen(true);
    };

    const handleAutoRetestApply = (status: FindingStatus, notes: string) => {
        if (!autoRetestRequest) return;
        setSelectedRequest(autoRetestRequest);
        setNewStatus(status);
        setRetestNotes(notes);
        setCompleteDialogOpen(true);
        setAutoRetestOpen(false);
        setAutoRetestRequest(null);
    };

    const getRequestDetails = (request: RetestRequest) => {
        const engagement = getEngagementById(request.engagementId);
        const client = getClient(request.clientId);
        const finding = engagement?.findings.find(f => f.id === request.findingId);
        const assignedEngineer = engineers.find(e => e.id === request.assignedTo);
        return { engagement, client, finding, assignedEngineer };
    };

    // ── History helpers ──────────────────────────────────────────────────────

    const toggleHistoryPanel = (setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) =>
        setter(s => ({ ...s, [id]: !s[id] }));

    const filteredHistory = historyResults.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (vulnSearch && !r.vulnerabilityType.toLowerCase().includes(vulnSearch.toLowerCase()) &&
            !r.findingTitle.toLowerCase().includes(vulnSearch.toLowerCase())) return false;
        return true;
    });

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Retests</h1>
                        <p className="text-muted-foreground text-sm">
                            Manage client-requested retests and review auto-retest engine history.
                        </p>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-lg w-fit border">
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'queue'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Queue
                        {requests.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
                                {requests.length}
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'history'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <History className="h-4 w-4" />
                        History
                        {historyResults.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
                                {historyResults.length}
                            </Badge>
                        )}
                    </button>
                </div>

                {/* ── QUEUE TAB ─────────────────────────────────────────────── */}
                {activeTab === 'queue' && (
                    <>
                        {requests.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                                <p className="text-sm text-muted-foreground">
                                    All retest requests have been completed. New requests from clients will appear here.
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {requests.map(request => {
                                    const { engagement, client, finding, assignedEngineer } = getRequestDetails(request);
                                    const statusConfig = QUEUE_STATUS_CONFIG[request.status] || QUEUE_STATUS_CONFIG['pending'];
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <Card key={request.id} className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Badge variant="outline" className={`${statusConfig.color}`}>
                                                            <StatusIcon className="mr-1 h-3 w-3" />
                                                            {statusConfig.label}
                                                        </Badge>
                                                        {finding && (
                                                            <Badge className="capitalize">{finding.severity}</Badge>
                                                        )}
                                                    </div>

                                                    <h3 className="text-lg font-semibold mb-1">
                                                        {finding?.title || 'Finding not found'}
                                                    </h3>

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                                        <span>{client?.companyName || 'Unknown Client'}</span>
                                                        <span>•</span>
                                                        <span>{engagement?.metadata.engagementName || 'Unknown Engagement'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(request.requestedAt)}
                                                        </span>
                                                    </div>

                                                    {request.clientNotes && (
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm mb-3">
                                                            <strong className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                                                                Client Notes:
                                                            </strong>
                                                            {request.clientNotes}
                                                        </div>
                                                    )}

                                                    {assignedEngineer && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span>Assigned to: <strong>{assignedEngineer.name}</strong></span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 ml-4">
                                                    {!request.assignedTo ? (
                                                        <Select onValueChange={(engineerId) => handleAssign(request.id, engineerId)}>
                                                            <SelectTrigger className="w-48">
                                                                <SelectValue placeholder="Assign engineer..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {engineers.map(engineer => (
                                                                    <SelectItem key={engineer.id} value={engineer.id}>
                                                                        {engineer.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                onClick={() => handleAutoRetestClick(request)}
                                                                className="gap-2 bg-violet-600 hover:bg-violet-700"
                                                                size="sm"
                                                            >
                                                                <Bot className="h-4 w-4" />
                                                                Auto-Retest
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleCompleteClick(request)}
                                                                className="gap-2"
                                                                size="sm"
                                                                variant={finding?.status === 'Resolved' ? 'secondary' : 'default'}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                {finding?.status === 'Resolved' ? 'Re-verify' : 'Manual Update'}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── HISTORY TAB ───────────────────────────────────────────── */}
                {activeTab === 'history' && (
                    <div>
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-5">
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as HistoryStatusFilter)}>
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="verified">Fixed</SelectItem>
                                    <SelectItem value="not_fixed">Not Fixed</SelectItem>
                                    <SelectItem value="failed">Inconclusive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="Search by finding or vuln type…"
                                value={vulnSearch}
                                onChange={(e) => setVulnSearch(e.target.value)}
                                className="flex-1"
                            />
                        </div>

                        {/* Empty State */}
                        {historyResults.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                                <h3 className="font-semibold text-lg mb-1">No retest runs yet</h3>
                                <p className="text-sm text-muted-foreground">
                                    Run an auto-retest from a finding and results will appear here.
                                </p>
                            </div>
                        )}
                        {historyResults.length > 0 && filteredHistory.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                <p className="text-muted-foreground text-sm">No runs match the current filters.</p>
                            </div>
                        )}

                        {/* Result Cards */}
                        <div className="space-y-3">
                            {filteredHistory.map((r) => {
                                const cfg = HISTORY_STATUS_CONFIG[r.status];
                                const Icon = cfg.icon;
                                const isExpanded = expandedId === r.id;
                                const ranAt = new Date(r.ranAt);

                                return (
                                    <div key={r.id} className="border rounded-xl overflow-hidden shadow-sm">
                                        {/* Card Header */}
                                        <button
                                            className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                                            onClick={() => {
                                                setExpandedId(prev => prev === r.id ? null : r.id);
                                                if (expandedId !== r.id) setShowAgentSteps(s => ({ ...s, [r.id]: true }));
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`}>
                                                    <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="font-semibold text-sm truncate">{r.findingTitle}</span>
                                                        <Badge variant="outline" className={`text-[11px] flex-shrink-0 ${cfg.badgeClass}`}>
                                                            {cfg.label}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[11px] flex-shrink-0">
                                                            {r.vulnerabilityType}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {ranAt.toLocaleDateString()} {ranAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {r.confidence > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Target className="h-3 w-3" />
                                                                {(r.confidence * 100).toFixed(0)}% confidence
                                                            </span>
                                                        )}
                                                        {r.turnsUsed > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Layers className="h-3 w-3" />
                                                                {r.turnsUsed}/{r.maxTurns} turns
                                                            </span>
                                                        )}
                                                        {r.screenshots.length > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Camera className="h-3 w-3" />
                                                                {r.screenshots.length} screenshot{r.screenshots.length !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 text-muted-foreground">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Detail */}
                                        {isExpanded && (
                                            <div className="border-t bg-muted/10 p-4 space-y-4">
                                                {/* Config grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div className="p-3 bg-background rounded border">
                                                        <p className="font-medium text-muted-foreground uppercase tracking-wide mb-1">Target URL</p>
                                                        <p className="font-mono break-all">{r.targetUrl || '—'}</p>
                                                    </div>
                                                    <div className="p-3 bg-background rounded border">
                                                        <p className="font-medium text-muted-foreground uppercase tracking-wide mb-1">Vuln Type</p>
                                                        <p>{r.vulnerabilityType}</p>
                                                    </div>
                                                </div>

                                                {r.reason && (
                                                    <div className="p-3 bg-background rounded border text-sm">
                                                        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Verdict Reason</p>
                                                        <p>{r.reason}</p>
                                                    </div>
                                                )}

                                                {/* Evidence summary */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Card className="p-3 text-center">
                                                        <Camera className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                                        <div className="text-base font-bold">{r.screenshots.length}</div>
                                                        <div className="text-[11px] text-muted-foreground">Screenshots</div>
                                                    </Card>
                                                    <Card className="p-3 text-center">
                                                        <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                                        <div className="text-base font-bold">{r.logEntries.length}</div>
                                                        <div className="text-[11px] text-muted-foreground">Log Entries</div>
                                                    </Card>
                                                    <Card className="p-3 text-center">
                                                        <Globe className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                                        <div className="text-base font-bold">{r.networkRequests.length}</div>
                                                        <div className="text-[11px] text-muted-foreground">Network Reqs</div>
                                                    </Card>
                                                </div>

                                                {/* Screenshots */}
                                                {r.screenshots.length > 0 && (
                                                    <div className="border rounded">
                                                        <button onClick={() => toggleHistoryPanel(setShowScreenshots, r.id)}
                                                            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50">
                                                            <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-blue-600" />Screenshots ({r.screenshots.length})</span>
                                                            {showScreenshots[r.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                        {showScreenshots[r.id] && (
                                                            <div className="border-t p-3">
                                                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded border px-3 py-1.5 mb-3 text-xs font-mono">
                                                                    <span className="flex gap-1 flex-shrink-0">
                                                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                                                        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                                                    </span>
                                                                    <span className="text-muted-foreground truncate flex-1 text-center">{r.targetUrl || '—'}</span>
                                                                </div>
                                                                <div className="grid grid-cols-4 gap-2 mb-3">
                                                                    {r.screenshots.map((ss, i) => (
                                                                        <button key={i}
                                                                            onClick={() => setSelectedSS(s => ({ ...s, [r.id]: s[r.id] === i ? null : i }))}
                                                                            className={`relative aspect-video rounded border-2 overflow-hidden transition-all hover:opacity-90 ${selectedSS[r.id] === i ? 'border-violet-500 ring-2 ring-violet-300' : 'border-transparent'}`}>
                                                                            <img src={`data:image/png;base64,${ss.data}`} alt={ss.name || `Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                                                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">{ss.name || `Step ${i + 1}`}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {selectedSS[r.id] != null && r.screenshots[selectedSS[r.id]!] && (
                                                                    <div className="border rounded p-2 bg-muted/30">
                                                                        <p className="text-xs font-medium mb-2 text-muted-foreground">{r.screenshots[selectedSS[r.id]!].name || `Screenshot ${selectedSS[r.id]! + 1}`}</p>
                                                                        <img src={`data:image/png;base64,${r.screenshots[selectedSS[r.id]!].data}`} alt={r.screenshots[selectedSS[r.id]!].name} className="w-full rounded border" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Agent Steps */}
                                                {r.agentTurns.length > 0 && (
                                                    <div className="border rounded">
                                                        <button onClick={() => toggleHistoryPanel(setShowAgentSteps, r.id)}
                                                            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50">
                                                            <span className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-600" />Agent Reasoning ({r.agentTurns.length} steps)</span>
                                                            {showAgentSteps[r.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                        {showAgentSteps[r.id] && (
                                                            <div className="border-t max-h-80 overflow-y-auto">
                                                                {r.agentTurns.map((turn, i) => (
                                                                    <div key={i} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/30">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-xs font-mono bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{turn.turn}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-sm">{ACTION_ICONS[turn.action] || '?'} <strong className="capitalize">{turn.action}</strong></span>
                                                                                {turn.reasoning && <p className="text-xs text-muted-foreground mt-1 italic">{turn.reasoning}</p>}
                                                                                <p className={`text-xs mt-1 font-mono ${turn.result?.startsWith('SUCCESS') ? 'text-emerald-600' : turn.result?.startsWith('ERROR') ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                                    {turn.result?.substring(0, 200)}{(turn.result?.length || 0) > 200 ? '…' : ''}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Final Reasoning */}
                                                {r.reasoningChain && (
                                                    <div className="p-3 bg-background rounded border text-sm">
                                                        <div className="flex items-center gap-2 mb-2"><Brain className="h-4 w-4 text-violet-600" /><strong className="text-xs uppercase tracking-wide">Final Reasoning</strong></div>
                                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.reasoningChain}</p>
                                                    </div>
                                                )}

                                                {/* Logs */}
                                                {r.logEntries.length > 0 && (
                                                    <div className="border rounded">
                                                        <button onClick={() => toggleHistoryPanel(setShowLogs, r.id)}
                                                            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50">
                                                            <span>Execution Log ({r.logEntries.length} entries)</span>
                                                            {showLogs[r.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                        {showLogs[r.id] && (
                                                            <div className="border-t max-h-48 overflow-y-auto">
                                                                {r.logEntries.map((log, i) => (
                                                                    <div key={i} className="px-3 py-1.5 text-xs font-mono border-b last:border-b-0 flex gap-2">
                                                                        <span className={`font-bold flex-shrink-0 ${log.level === 'error' ? 'text-red-600' : log.level === 'debug' ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                                            [{log.level?.toUpperCase() || 'INFO'}]
                                                                        </span>
                                                                        <span className="break-all">{log.msg}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Network */}
                                                {r.networkRequests.length > 0 && (
                                                    <div className="border rounded">
                                                        <button onClick={() => toggleHistoryPanel(setShowNetwork, r.id)}
                                                            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50">
                                                            <span>Network Requests ({r.networkRequests.length})</span>
                                                            {showNetwork[r.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                        {showNetwork[r.id] && (
                                                            <div className="border-t max-h-48 overflow-y-auto">
                                                                {r.networkRequests.map((req, i) => (
                                                                    <div key={i} className="px-3 py-2 text-xs font-mono border-b last:border-b-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${req.status < 300 ? 'text-emerald-600' : req.status < 400 ? 'text-yellow-600' : 'text-red-600'}`}>{req.status}</Badge>
                                                                            <span className="font-bold">{req.method}</span>
                                                                            <span className="truncate text-muted-foreground">{req.url}</span>
                                                                        </div>
                                                                        {req.response_body && (
                                                                            <div className="mt-1 text-muted-foreground truncate pl-12">
                                                                                {req.response_body.substring(0, 120)}{req.response_body.length > 120 ? '…' : ''}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {r.error && (
                                                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 text-sm">
                                                        <strong>Error: </strong>{r.error}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Dialogs ────────────────────────────────────────────────────── */}

            {/* Auto-Retest Dialog */}
            {autoRetestRequest && (() => {
                const { finding } = getRequestDetails(autoRetestRequest);
                return finding ? (
                    <AutoRetestDialog
                        open={autoRetestOpen}
                        onOpenChange={(open) => { setAutoRetestOpen(open); if (!open) setAutoRetestRequest(null); }}
                        finding={finding}
                        engagementId={autoRetestRequest.engagementId}
                        onApplyResult={handleAutoRetestApply}
                    />
                ) : null;
            })()}

            {/* Complete Retest Dialog */}
            {selectedRequest && (
                <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Update Finding Status</DialogTitle>
                            <DialogDescription>
                                Verify the remediation and update the finding status accordingly.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>New Finding Status *</Label>
                                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FindingStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Resolved">
                                            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Resolved - Fix Verified</div>
                                        </SelectItem>
                                        <SelectItem value="In Progress">
                                            <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-yellow-600" />In Progress - Partial Fix</div>
                                        </SelectItem>
                                        <SelectItem value="Open">
                                            <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" />Open - Still Vulnerable</div>
                                        </SelectItem>
                                        <SelectItem value="Accepted Risk">Accepted Risk</SelectItem>
                                        <SelectItem value="False Positive">False Positive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Retest Notes (Optional)</Label>
                                <Textarea
                                    placeholder="Document your verification findings..."
                                    value={retestNotes}
                                    onChange={(e) => setRetestNotes(e.target.value)}
                                    rows={4}
                                />
                            </div>
                            {newStatus === 'Open' && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 text-sm flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div><strong>Still vulnerable:</strong> The client will be notified that the fix was unsuccessful.</div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleComplete}>Confirm Status Update</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
