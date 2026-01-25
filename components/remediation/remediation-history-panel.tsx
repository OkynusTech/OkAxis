'use client';

/**
 * Remediation History Panel
 * 
 * Displays complete remediation timeline for a finding with:
 * - All attempts (successful and failed)
 * - Verification status
 * - Effort tracking
 * - AI-powered suggestions
 */

import { useState, useEffect } from 'react';
import { Finding, RemediationEvent, RemediationSuggestion } from '@/lib/types';
import { getRemediationHistory } from '@/lib/storage';
import { getRemediationSuggestions, identifyFailedApproaches } from '@/lib/remediation-intelligence';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Lightbulb,
    TrendingUp,
    User,
    Calendar,
    Sparkles,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { formatDate } from '@/lib/report-utils';

interface RemediationHistoryPanelProps {
    finding: Finding;
    clientId: string;
    showSuggestions?: boolean;
}

const OUTCOME_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    'successful': { icon: CheckCircle, color: 'text-green-600', label: 'Successful' },
    'partially-successful': { icon: AlertTriangle, color: 'text-yellow-600', label: 'Partially Successful' },
    'failed': { icon: XCircle, color: 'text-red-600', label: 'Failed' },
    'pending-verification': { icon: Clock, color: 'text-blue-600', label: 'Pending Verification' },
    'reverted': { icon: XCircle, color: 'text-orange-600', label: 'Reverted' },
    'superseded': { icon: TrendingUp, color: 'text-purple-600', label: 'Superseded' },
};

export function RemediationHistoryPanel({ finding, clientId, showSuggestions = true }: RemediationHistoryPanelProps) {
    const [history, setHistory] = useState<RemediationEvent[]>([]);
    const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
    const [failedApproaches, setFailedApproaches] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Load remediation history
        const hist = getRemediationHistory(finding.id);
        setHistory(hist.sort((a, b) => new Date(b.implementedAt).getTime() - new Date(a.implementedAt).getTime()));

        // Load AI suggestions and failed approaches
        if (showSuggestions) {
            loadIntelligence();
        }
    }, [finding.id, clientId, showSuggestions]);

    const loadIntelligence = async () => {
        setLoadingSuggestions(true);
        try {
            const [sugg, failed] = await Promise.all([
                getRemediationSuggestions(finding, clientId),
                Promise.resolve(identifyFailedApproaches(finding, clientId))
            ]);
            setSuggestions(sugg);
            setFailedApproaches(failed);
        } catch (error) {
            console.error('Failed to load remediation intelligence:', error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const toggleEventExpansion = (eventId: string) => {
        const newExpanded = new Set(expandedEvents);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
        }
        setExpandedEvents(newExpanded);
    };

    if (history.length === 0 && !showSuggestions) {
        return (
            <Card className="p-6 text-center text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No remediation attempts recorded yet.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* AI Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">AI-Powered Recommendations</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Based on {suggestions[0]?.sampleSize || 0} similar cases
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {suggestions.map((sugg, idx) => (
                            <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Lightbulb className="h-4 w-4 text-indigo-600" />
                                            <span className="font-medium">{sugg.approach}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <Badge variant="outline">{sugg.type}</Badge>
                                            {sugg.averageEffort && (
                                                <span>Effort: {sugg.averageEffort}</span>
                                            )}
                                            {sugg.successRate > 0 && (
                                                <span className="text-green-600 font-medium">
                                                    {(sugg.successRate * 100).toFixed(0)}% success rate
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant={sugg.confidence === 'high' ? 'default' : 'secondary'}>
                                        {sugg.confidence}
                                    </Badge>
                                </div>

                                {sugg.warnings && sugg.warnings.length > 0 && (
                                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong>Warnings:</strong>
                                                <ul className="list-disc list-inside mt-1 space-y-0.5">
                                                    {sugg.warnings.map((w, i) => (
                                                        <li key={i}>{w}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Failed Approaches Warning */}
            {failedApproaches.length > 0 && (
                <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Approaches with Known Failures</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                {failedApproaches.map((fa, idx) => (
                                    <div key={idx}>
                                        <strong>{fa.approach}:</strong> Failed {fa.failureCount}x - {fa.reason}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Remediation History Timeline */}
            {history.length > 0 && (
                <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Remediation Timeline
                    </h3>

                    <div className="space-y-4">
                        {history.map((event, idx) => {
                            const config = OUTCOME_CONFIG[event.outcome] || OUTCOME_CONFIG['pending-verification'];
                            const Icon = config.icon;
                            const isExpanded = expandedEvents.has(event.id);

                            return (
                                <div key={event.id} className="relative">
                                    {/* Timeline connector */}
                                    {idx < history.length - 1 && (
                                        <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                                    )}

                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 p-2 rounded-full border-2 bg-background ${config.color}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="flex items-start justify-between cursor-pointer hover:bg-muted/50 p-2 -ml-2 rounded"
                                                onClick={() => toggleEventExpansion(event.id)}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        <Badge variant="outline" className="text-xs">
                                                            {event.type}
                                                        </Badge>
                                                        <Badge className={`text-xs ${config.color}`} variant="outline">
                                                            {config.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-medium line-clamp-2">
                                                        {event.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(event.implementedAt)}
                                                        </span>
                                                        {event.estimatedEffort && (
                                                            <span>Est: {event.estimatedEffort}</span>
                                                        )}
                                                        {event.actualEffort && (
                                                            <span>Actual: {event.actualEffort}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-3 pl-2 space-y-3 text-sm">
                                                    {event.verificationNotes && (
                                                        <div>
                                                            <strong className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                Verification Notes:
                                                            </strong>
                                                            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                                                                {event.verificationNotes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {event.verifiedAt && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Verified on {formatDate(event.verifiedAt)}
                                                            {event.verifiedBy && ` by ${event.verifiedBy}`}
                                                        </div>
                                                    )}

                                                    {event.metadata.reappeared && (
                                                        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                                                            ⚠️ This finding reappeared after this remediation
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
