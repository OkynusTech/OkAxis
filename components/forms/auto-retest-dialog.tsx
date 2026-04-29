'use client';

/**
 * Auto-Retest Dialog
 *
 * Sends finding details to the agentic retest_engine server.
 * The engine runs an observe-reason-act loop (AI agent + Playwright browser)
 * and returns a verdict with full evidence trail.
 */

import { useState } from 'react';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Finding, FindingStatus } from '@/lib/types';
import { saveAutoRetestResult, getAutoRetestResultsByFinding } from '@/lib/storage';
import {
    Bot, Loader2, CheckCircle2, XCircle, AlertTriangle,
    Camera, FileText, Globe, ChevronDown, ChevronUp,
    Zap, Shield, Brain, ArrowRight, History, Clock, Target,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AutoRetestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    finding: Finding;
    engagementId: string;
    onApplyResult?: (status: FindingStatus, notes: string) => void;
}

type EngineStatus = 'verified' | 'not_fixed' | 'failed';

interface AgentTurn {
    turn: number;
    action: string;
    reasoning: string;
    result: string;
}

interface EngineEvidence {
    screenshots: any[];
    logs: { level: string; msg: string; time?: string }[];
    network_data: { url: string; method: string; status: number; response_body?: string }[];
    details?: {
        confidence?: number;
        reason?: string;
        reasoning_chain?: string;
        turns_used?: number;
        max_turns?: number;
        agent_turns?: AgentTurn[];
        probe_url?: string;
        http_status?: number;
    };
}

interface EngineResult {
    retest_id: string;
    status: EngineStatus;
    evidence: EngineEvidence;
    error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RETEST_ENGINE_URL = '/api/retest';

const STATUS_MAP: Record<EngineStatus, { label: string; color: string; icon: any; findingStatus: FindingStatus }> = {
    verified:  { label: 'FIXED',       color: 'bg-green-600 text-white', icon: CheckCircle2, findingStatus: 'Resolved' },
    not_fixed: { label: 'NOT FIXED',   color: 'bg-red-600 text-white',   icon: XCircle,      findingStatus: 'Open' },
    failed:    { label: 'INCONCLUSIVE', color: 'bg-yellow-600 text-white', icon: AlertTriangle, findingStatus: 'In Progress' },
};

const VULN_TYPES = [
    { value: 'IDOR', label: 'IDOR (Insecure Direct Object Reference)' },
    { value: 'STORED_XSS', label: 'Stored XSS (Cross-Site Scripting)' },
    { value: 'REFLECTED_XSS', label: 'Reflected XSS (Cross-Site Scripting)' },
    { value: 'AUTH_BYPASS', label: 'Authentication/Authorization Bypass' },
    { value: 'CSRF', label: 'CSRF (Cross-Site Request Forgery)' },
    { value: 'OPEN_REDIRECT', label: 'Open Redirect' },
    { value: 'SQLI', label: 'SQL Injection' },
];

const ACTION_ICONS: Record<string, string> = {
    navigate: '🌐',
    fill: '✏️',
    click: '👆',
    api_request: '📡',
    evaluate_js: '⚡',
    wait: '⏳',
};

// ── Component ────────────────────────────────────────────────────────────────

export function AutoRetestDialog({
    open, onOpenChange, finding, engagementId, onApplyResult,
}: AutoRetestDialogProps) {
    // Form state
    const [targetUrl, setTargetUrl] = useState(finding.affectedAssets?.[0] || '');
    const [vulnType, setVulnType] = useState<string>(
        guessVulnType(finding.title, finding.category)
    );
    const [steps, setSteps] = useState(finding.stepsToReproduce || finding.description || '');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authType, setAuthType] = useState<string>('form');
    const [bearerToken, setBearerToken] = useState('');
    const [cookieJson, setCookieJson] = useState('');
    const [oauthTokenUrl, setOauthTokenUrl] = useState('');
    const [oauthClientId, setOauthClientId] = useState('');

    // Execution state
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<EngineResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // SSE streaming state
    const [currentTurn, setCurrentTurn] = useState(0);
    const [maxTurns, setMaxTurns] = useState(15);
    const [liveActions, setLiveActions] = useState<Array<{ turn: number; action: string; reasoning: string; result?: string }>>([]);

    // UI state
    const [showLogs, setShowLogs] = useState(false);
    const [showNetwork, setShowNetwork] = useState(false);
    const [showAgentSteps, setShowAgentSteps] = useState(true);
    const [showScreenshots, setShowScreenshots] = useState(false);
    const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
    const [showPrevRuns, setShowPrevRuns] = useState(false);

    // Previous runs for this finding
    const prevRuns = getAutoRetestResultsByFinding(finding.id);

    const handleRun = async () => {
        if (!targetUrl || !vulnType || !steps) {
            setError('Target URL, vulnerability type, and steps are required.');
            return;
        }
        if (authType === 'form' && (!username || !password)) {
            setError('Username and password are required for form login.');
            return;
        }
        if (authType === 'bearer_token' && !bearerToken) {
            setError('Bearer token is required.');
            return;
        }
        if (authType === 'cookie' && !cookieJson) {
            setError('Cookie JSON is required.');
            return;
        }
        if (authType === 'oauth_password' && (!oauthTokenUrl || !username || !password)) {
            setError('Token URL, username, and password are required for OAuth.');
            return;
        }

        setIsRunning(true);
        setResult(null);
        setError(null);
        setCurrentTurn(0);
        setLiveActions([]);

        // Build credentials based on auth type
        let creds: Record<string, any> = { auth_type: authType };
        if (authType === 'form') {
            creds = { ...creds, username, password };
        } else if (authType === 'bearer_token') {
            creds = { ...creds, token: bearerToken };
        } else if (authType === 'cookie') {
            try {
                creds = { ...creds, cookies: JSON.parse(cookieJson) };
            } catch {
                setError('Invalid cookie JSON format.');
                setIsRunning(false);
                return;
            }
        } else if (authType === 'oauth_password') {
            creds = { ...creds, token_url: oauthTokenUrl, client_id: oauthClientId, username, password };
        }

        const requestBody = JSON.stringify({
            retest_id: `auto_${finding.id}_${Date.now()}`,
            vulnerability_type: vulnType,
            target_url: targetUrl,
            steps_to_reproduce: steps,
            credentials: creds,
        });

        try {
            // Try SSE streaming first, fall back to regular fetch
            const streamRes = await fetch('/api/retest/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
                signal: AbortSignal.timeout(300_000),
            });

            if (streamRes.ok && streamRes.body) {
                // SSE streaming mode
                const reader = streamRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let completeData: EngineResult | null = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            // Next data line will correspond to this event type
                        } else if (line.startsWith('data: ')) {
                            try {
                                const eventData = JSON.parse(line.slice(6));
                                // Determine event type from the data shape
                                if (eventData.turn !== undefined && eventData.max_turns !== undefined && !eventData.action) {
                                    setCurrentTurn(eventData.turn);
                                    setMaxTurns(eventData.max_turns);
                                } else if (eventData.action && eventData.reasoning !== undefined) {
                                    setLiveActions(prev => [...prev, {
                                        turn: eventData.turn,
                                        action: eventData.action,
                                        reasoning: eventData.reasoning,
                                    }]);
                                } else if (eventData.result && eventData.turn) {
                                    setLiveActions(prev => prev.map(a =>
                                        a.turn === eventData.turn && !a.result
                                            ? { ...a, result: eventData.result }
                                            : a
                                    ));
                                } else if (eventData.retest_id && eventData.status) {
                                    completeData = eventData as EngineResult;
                                } else if (eventData.message) {
                                    // Engine emitted an error event
                                    throw new Error(`Engine Error: ${eventData.message}`);
                                }
                            } catch {
                                // Skip unparseable lines
                            }
                        }
                    }
                }

                if (completeData) {
                    setResult(completeData);
                    _persistResult(completeData);
                } else {
                    throw new Error('Stream ended without a complete result');
                }
            } else {
                // Fallback: regular non-streaming request
                const res = await fetch('/api/retest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody,
                    signal: AbortSignal.timeout(300_000),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Engine returned ${res.status}: ${text}`);
                }

                const data: EngineResult = await res.json();
                setResult(data);
                _persistResult(data);
            }
        } catch (err: any) {
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                setError('Cannot connect to retest engine. Is it running? (Check RETEST_ENGINE_URL)');
            } else {
                setError(err.message || 'Unknown error');
            }
        } finally {
            setIsRunning(false);
        }
    };

    const _persistResult = (data: EngineResult) => {
        const det = data.evidence?.details;
        saveAutoRetestResult({
            id: data.retest_id || `rr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            findingId: finding.id,
            findingTitle: finding.title,
            engagementId,
            targetUrl,
            vulnerabilityType: vulnType,
            stepsToReproduce: steps,
            status: data.status,
            confidence: det?.confidence ?? 0,
            reason: det?.reason ?? '',
            reasoningChain: det?.reasoning_chain ?? '',
            turnsUsed: det?.turns_used ?? 0,
            maxTurns: det?.max_turns ?? 15,
            agentTurns: det?.agent_turns ?? [],
            screenshots: (data.evidence?.screenshots ?? []).map((s: any) => ({ name: s.name || '', data: s.data || '' })),
            logEntries: data.evidence?.logs ?? [],
            networkRequests: data.evidence?.network_data ?? [],
            error: data.error,
            ranAt: new Date().toISOString(),
        });
    };

    const handleApply = () => {
        if (!result || !onApplyResult) return;
        const mapping = STATUS_MAP[result.status];
        const details = result.evidence?.details;
        const notes = [
            `[AUTO-RETEST] Verdict: ${mapping.label}`,
            details?.confidence != null ? `Confidence: ${(details.confidence * 100).toFixed(0)}%` : '',
            details?.reason ? `Reason: ${details.reason}` : '',
            details?.reasoning_chain ? `\nAgent Reasoning:\n${details.reasoning_chain}` : '',
            result.error ? `Error: ${result.error}` : '',
        ].filter(Boolean).join('\n');

        onApplyResult(mapping.findingStatus, notes);
        onOpenChange(false);
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setIsRunning(false);
            setResult(null);
            setError(null);
            setShowLogs(false);
            setShowNetwork(false);
            setShowAgentSteps(true);
            setShowScreenshots(false);
            setSelectedScreenshot(null);
        }
        onOpenChange(isOpen);
    };

    const details = result?.evidence?.details;
    const agentTurns = details?.agent_turns || [];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-violet-600" />
                        Auto-Retest Engine
                    </DialogTitle>
                    <DialogDescription>
                        AI agent autonomously tests vulnerability using observe-reason-act loop.
                    </DialogDescription>
                </DialogHeader>

                {/* Finding Context */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border">
                    <h4 className="font-medium text-sm">{finding.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="capitalize">{finding.severity}</span>
                        <span>-</span>
                        <span>{finding.status}</span>
                        {finding.category && (
                            <>
                                <span>-</span>
                                <span>{finding.category}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Config Form */}
                {!result && (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>Target URL *</Label>
                            <Input
                                placeholder="http://target-app.com"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Vulnerability Type *</Label>
                            <Select value={vulnType} onValueChange={setVulnType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {VULN_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Steps to Reproduce *</Label>
                            <Textarea
                                placeholder="Login as user A, navigate to /api/users/B..."
                                value={steps}
                                onChange={(e) => setSteps(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Authentication Method</Label>
                            <select
                                value={authType}
                                onChange={(e) => setAuthType(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="form">Form Login (username/password)</option>
                                <option value="bearer_token">Bearer Token</option>
                                <option value="cookie">Cookie Injection</option>
                                <option value="oauth_password">OAuth2 Password Grant</option>
                            </select>
                        </div>

                        {/* Form login fields */}
                        {(authType === 'form' || authType === 'oauth_password') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Username *</Label>
                                    <Input
                                        placeholder="test_user"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Password *</Label>
                                    <Input
                                        type="password"
                                        placeholder="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Bearer token field */}
                        {authType === 'bearer_token' && (
                            <div className="grid gap-2">
                                <Label>Bearer Token *</Label>
                                <Input
                                    type="password"
                                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                                    value={bearerToken}
                                    onChange={(e) => setBearerToken(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">The token will be sent as Authorization: Bearer &lt;token&gt;</p>
                            </div>
                        )}

                        {/* Cookie injection field */}
                        {authType === 'cookie' && (
                            <div className="grid gap-2">
                                <Label>Cookies (JSON) *</Label>
                                <Textarea
                                    placeholder={'[\n  {"name": "session", "value": "abc123", "domain": ".example.com"}\n]'}
                                    value={cookieJson}
                                    onChange={(e) => setCookieJson(e.target.value)}
                                    rows={3}
                                />
                                <p className="text-xs text-muted-foreground">JSON array of cookie objects with name, value, and domain fields.</p>
                            </div>
                        )}

                        {/* OAuth fields */}
                        {authType === 'oauth_password' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Token URL *</Label>
                                    <Input
                                        placeholder="https://auth.example.com/oauth/token"
                                        value={oauthTokenUrl}
                                        onChange={(e) => setOauthTokenUrl(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Client ID</Label>
                                    <Input
                                        placeholder="client_id (optional)"
                                        value={oauthClientId}
                                        onChange={(e) => setOauthClientId(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Agentic info banner */}
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded border border-violet-200 dark:border-violet-800 text-sm flex items-start gap-2">
                            <Shield className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                            <div className="text-muted-foreground text-xs">
                                <strong className="text-foreground">Agentic testing:</strong> The AI agent observes the page after every action,
                                reasons about what it sees, and adapts its approach. It takes screenshots, analyzes responses,
                                and only issues a verdict when it has concrete evidence.
                            </div>
                        </div>

                        {/* Previous Runs for this finding */}
                        {prevRuns.length > 0 && (
                            <div className="border rounded">
                                <button
                                    onClick={() => setShowPrevRuns(v => !v)}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <History className="h-4 w-4 text-violet-600" />
                                        Previous Runs
                                        <Badge variant="secondary" className="text-[11px] px-1.5">{prevRuns.length}</Badge>
                                    </span>
                                    {showPrevRuns ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showPrevRuns && (
                                    <div className="border-t divide-y max-h-60 overflow-y-auto">
                                        {prevRuns.map((r) => {
                                            const ranAt = new Date(r.ranAt);
                                            const statusColors = {
                                                verified:  'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
                                                not_fixed: 'text-red-600 bg-red-50 dark:bg-red-900/20',
                                                failed:    'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                                            };
                                            const statusLabels = {
                                                verified: 'Fixed', not_fixed: 'Not Fixed', failed: 'Inconclusive',
                                            };
                                            const StatusIcon = r.status === 'verified' ? CheckCircle2 : r.status === 'not_fixed' ? XCircle : AlertTriangle;
                                            return (
                                                <div key={r.id} className="px-3 py-2.5 hover:bg-muted/30">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded ${statusColors[r.status]}`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusLabels[r.status]}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            {ranAt.toLocaleDateString()} {ranAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {r.confidence > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Target className="h-3 w-3" />
                                                                {(r.confidence * 100).toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    {r.reason && (
                                                        <p className="text-xs text-muted-foreground mt-1 truncate">{r.reason}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>{error}</div>
                    </div>
                )}

                {/* Loading / Live Progress */}
                {isRunning && (
                    <div className="py-4 space-y-4">
                        <div className="text-center">
                            <div className="relative mx-auto w-16 h-16 mb-3">
                                <Loader2 className="h-16 w-16 animate-spin text-violet-600/30" />
                                <Brain className="h-8 w-8 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-sm font-medium">Agent is testing...</p>
                        </div>

                        {/* Progress bar */}
                        {currentTurn > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Turn {currentTurn} / {maxTurns}</span>
                                    <span>{Math.round((currentTurn / maxTurns) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-600 rounded-full transition-all duration-500"
                                        style={{ width: `${(currentTurn / maxTurns) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Live action trace */}
                        {liveActions.length > 0 && (
                            <div className="max-h-48 overflow-y-auto rounded border border-border bg-muted/30 p-2 space-y-1.5">
                                {liveActions.map((a, i) => (
                                    <div key={i} className="text-xs flex items-start gap-2">
                                        <span className="inline-flex items-center gap-1 shrink-0 font-mono text-violet-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                            T{a.turn}
                                        </span>
                                        <span className="font-medium shrink-0">{ACTION_ICONS[a.action] || '?'} {a.action}</span>
                                        <span className="text-muted-foreground truncate">{a.reasoning}</span>
                                        {a.result && (
                                            <span className={`shrink-0 ${a.result.startsWith('SUCCESS') ? 'text-green-600' : 'text-red-500'}`}>
                                                {a.result.startsWith('SUCCESS') ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Animated flow */}
                        {liveActions.length === 0 && (
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                    Navigate
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                                    Observe
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                                    Reason
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '0.9s' }} />
                                    Act
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {result && !isRunning && (
                    <div className="space-y-4 py-2">
                        {/* Status Banner */}
                        {(() => {
                            const mapping = STATUS_MAP[result.status];
                            const Icon = mapping.icon;
                            return (
                                <Card className={`p-4 ${mapping.color}`}>
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-6 w-6" />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg">{mapping.label}</h3>
                                            {details?.reason && (
                                                <p className="text-sm opacity-90 mt-0.5">
                                                    {details.reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {details?.confidence != null && (
                                                <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                                                    {(details.confidence * 100).toFixed(0)}% confident
                                                </Badge>
                                            )}
                                            {details?.turns_used != null && (
                                                <span className="text-xs opacity-75">
                                                    {details.turns_used} / {details.max_turns || 15} turns
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })()}

                        {/* Error detail */}
                        {result.error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 text-sm">
                                {result.error}
                            </div>
                        )}

                        {/* Evidence Summary */}
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="p-3 text-center">
                                <Camera className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                <div className="text-lg font-bold">{result.evidence?.screenshots?.length || 0}</div>
                                <div className="text-xs text-muted-foreground">Screenshots</div>
                            </Card>
                            <Card className="p-3 text-center">
                                <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                <div className="text-lg font-bold">{result.evidence?.logs?.length || 0}</div>
                                <div className="text-xs text-muted-foreground">Log Entries</div>
                            </Card>
                            <Card className="p-3 text-center">
                                <Globe className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                <div className="text-lg font-bold">{result.evidence?.network_data?.length || 0}</div>
                                <div className="text-xs text-muted-foreground">Network Requests</div>
                            </Card>
                        </div>

                        {/* Screenshots Gallery */}
                        {(result.evidence?.screenshots?.length ?? 0) > 0 && (
                            <div className="border rounded">
                                <button
                                    onClick={() => { setShowScreenshots(!showScreenshots); setSelectedScreenshot(null); }}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-blue-600" />
                                        Screenshots ({result.evidence.screenshots.length})
                                    </span>
                                    {showScreenshots ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showScreenshots && (
                                    <div className="border-t p-3">
                                        {/* URL Address Bar */}
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded border px-3 py-1.5 mb-3 text-xs font-mono">
                                            <span className="flex gap-1 flex-shrink-0">
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                            </span>
                                            <span className="text-muted-foreground truncate flex-1 text-center">{targetUrl || '—'}</span>
                                        </div>
                                        {/* Thumbnail grid */}
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {result.evidence.screenshots.map((ss: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedScreenshot(selectedScreenshot === i ? null : i)}
                                                    className={`relative aspect-video rounded border-2 overflow-hidden transition-all hover:opacity-90 ${selectedScreenshot === i ? 'border-violet-500 ring-2 ring-violet-300' : 'border-transparent'}`}
                                                >
                                                    <img
                                                        src={`data:image/png;base64,${ss.data}`}
                                                        alt={ss.name || `Screenshot ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                                                        {ss.name || `Step ${i + 1}`}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        {/* Selected screenshot full view */}
                                        {selectedScreenshot !== null && result.evidence.screenshots[selectedScreenshot] && (
                                            <div className="border rounded p-2 bg-muted/30">
                                                <p className="text-xs font-medium mb-2 text-muted-foreground">
                                                    {result.evidence.screenshots[selectedScreenshot].name || `Screenshot ${selectedScreenshot + 1}`}
                                                </p>
                                                <img
                                                    src={`data:image/png;base64,${result.evidence.screenshots[selectedScreenshot].data}`}
                                                    alt={result.evidence.screenshots[selectedScreenshot].name}
                                                    className="w-full rounded border"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Agent Reasoning Chain */}
                        {agentTurns.length > 0 && (
                            <div className="border rounded">
                                <button
                                    onClick={() => setShowAgentSteps(!showAgentSteps)}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-violet-600" />
                                        Agent Reasoning ({agentTurns.length} steps)
                                    </span>
                                    {showAgentSteps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showAgentSteps && (
                                    <div className="border-t max-h-80 overflow-y-auto">
                                        {agentTurns.map((turn, i) => (
                                            <div key={i} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/30">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-mono bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                                                        {turn.turn}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">
                                                                {ACTION_ICONS[turn.action] || '?'}{' '}
                                                                <strong className="capitalize">{turn.action}</strong>
                                                            </span>
                                                        </div>
                                                        {turn.reasoning && (
                                                            <p className="text-xs text-muted-foreground mt-1 italic">
                                                                {turn.reasoning}
                                                            </p>
                                                        )}
                                                        <p className={`text-xs mt-1 font-mono ${turn.result?.startsWith('SUCCESS') ? 'text-green-600' : turn.result?.startsWith('ERROR') ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                            {turn.result?.substring(0, 200)}
                                                            {(turn.result?.length || 0) > 200 ? '...' : ''}
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
                        {details?.reasoning_chain && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-4 w-4 text-violet-600" />
                                    <strong className="text-xs uppercase tracking-wide">Final Reasoning</strong>
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {details.reasoning_chain}
                                </p>
                            </div>
                        )}

                        {/* Expandable Logs */}
                        {(result.evidence?.logs?.length ?? 0) > 0 && (
                            <div className="border rounded">
                                <button
                                    onClick={() => setShowLogs(!showLogs)}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                                >
                                    <span>Execution Log ({result.evidence.logs.length} entries)</span>
                                    {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showLogs && (
                                    <div className="border-t max-h-48 overflow-y-auto">
                                        {result.evidence.logs.map((log, i) => (
                                            <div key={i} className="px-3 py-1.5 text-xs font-mono border-b last:border-b-0 flex gap-2">
                                                <span className={`font-bold ${log.level === 'error' ? 'text-red-600' : log.level === 'debug' ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                    [{log.level?.toUpperCase() || 'INFO'}]
                                                </span>
                                                <span className="break-all">{log.msg}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expandable Network */}
                        {(result.evidence?.network_data?.length ?? 0) > 0 && (
                            <div className="border rounded">
                                <button
                                    onClick={() => setShowNetwork(!showNetwork)}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                                >
                                    <span>Network Requests ({result.evidence.network_data.length})</span>
                                    {showNetwork ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showNetwork && (
                                    <div className="border-t max-h-48 overflow-y-auto">
                                        {result.evidence.network_data.map((req, i) => (
                                            <div key={i} className="px-3 py-2 text-xs font-mono border-b last:border-b-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`text-[10px] ${req.status < 300 ? 'text-green-600' : req.status < 400 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {req.status}
                                                    </Badge>
                                                    <span className="font-bold">{req.method}</span>
                                                    <span className="truncate text-muted-foreground">{req.url}</span>
                                                </div>
                                                {req.response_body && (
                                                    <div className="mt-1 text-muted-foreground truncate pl-12">
                                                        {req.response_body.substring(0, 120)}
                                                        {req.response_body.length > 120 ? '...' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isRunning}>
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button onClick={handleRun} disabled={isRunning} className="gap-2 bg-violet-600 hover:bg-violet-700">
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Agent Running...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    Run Auto-Retest
                                </>
                            )}
                        </Button>
                    )}
                    {result && onApplyResult && (
                        <Button onClick={handleApply} className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Apply Result to Finding
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function guessVulnType(title: string, category?: string): string {
    const text = `${title} ${category || ''}`.toLowerCase();
    if (text.includes('idor') || text.includes('insecure direct') || text.includes('access control')) {
        return 'IDOR';
    }
    if (text.includes('reflected xss') || text.includes('reflected cross-site')) {
        return 'REFLECTED_XSS';
    }
    if (text.includes('stored xss') || text.includes('persistent xss') || text.includes('xss') || text.includes('cross-site scripting') || text.includes('script injection')) {
        return 'STORED_XSS';
    }
    if (text.includes('auth bypass') || text.includes('authentication bypass') || text.includes('broken auth') || text.includes('privilege escalation') || text.includes('authorization bypass')) {
        return 'AUTH_BYPASS';
    }
    if (text.includes('csrf') || text.includes('cross-site request') || text.includes('request forgery')) {
        return 'CSRF';
    }
    if (text.includes('open redirect') || text.includes('url redirect') || text.includes('unvalidated redirect')) {
        return 'OPEN_REDIRECT';
    }
    if (text.includes('sql injection') || text.includes('sqli') || text.includes('sql inject')) {
        return 'SQLI';
    }
    return 'IDOR';
}
