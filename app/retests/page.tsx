'use client';

/**
 * Retest Queue Dashboard (Provider-Side)
 * 
 * Central dashboard for security teams to:
 * - View all pending retest requests from clients
 * - Assign engineers to requests
 * - Complete retests and update finding statuses
 */

import { useState, useEffect } from 'react';
import {
    getPendingRetestRequests,
    assignRetestRequest,
    completeRetestRequest,
    getAllEngineers,
    getEngagementById,
    getClient
} from '@/lib/storage';
import { RetestRequest, Engineer, FindingStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Calendar,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import { formatDate } from '@/lib/report-utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    'pending': { icon: Clock, color: 'text-blue-600', label: 'Pending' },
    'assigned': { icon: User, color: 'text-purple-600', label: 'Assigned' },
    'in-progress': { icon: RefreshCw, color: 'text-yellow-600', label: 'In Progress' },
};

export default function RetestQueuePage() {
    const [requests, setRequests] = useState<RetestRequest[]>([]);
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RetestRequest | null>(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [retestNotes, setRetestNotes] = useState('');
    const [newStatus, setNewStatus] = useState<FindingStatus>('Resolved');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const allRequests = getPendingRetestRequests();

        // Deduplicate: Keep only the latest request per finding ID
        const uniqueMap = new Map<string, RetestRequest>();
        allRequests.forEach(req => {
            const existing = uniqueMap.get(req.findingId);
            if (!existing || new Date(req.requestedAt) > new Date(existing.requestedAt)) {
                uniqueMap.set(req.findingId, req);
            }
        });

        // Convert back to array and sort by date
        const uniqueRequests = Array.from(uniqueMap.values()).sort((a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );

        setRequests(uniqueRequests);
        setEngineers(getAllEngineers());
    };

    const handleAssign = (requestId: string, engineerId: string) => {
        assignRetestRequest(requestId, engineerId);
        loadData();
    };

    const handleCompleteClick = (request: RetestRequest) => {
        setSelectedRequest(request);
        setCompleteDialogOpen(true);
        setRetestNotes('');

        // Smart Default: If currently Open, default to Resolved. If Resolved, default to Open (re-opening).
        const engagement = getEngagementById(request.engagementId);
        const finding = engagement?.findings.find(f => f.id === request.findingId);

        if (finding?.status === 'Resolved') {
            setNewStatus('Open'); // Assume re-opening if retesting a resolved issue
        } else {
            setNewStatus('Resolved'); // Assume fixing if retesting an open issue
        }
    };

    const handleComplete = () => {
        if (!selectedRequest) return;

        completeRetestRequest(
            selectedRequest.id,
            'eng_default', // Would get from auth
            newStatus,
            retestNotes || undefined
        );

        setCompleteDialogOpen(false);
        setSelectedRequest(null);
        loadData();
    };

    const getRequestDetails = (request: RetestRequest) => {
        const engagement = getEngagementById(request.engagementId);
        const client = getClient(request.clientId);
        const finding = engagement?.findings.find(f => f.id === request.findingId);
        const assignedEngineer = engineers.find(e => e.id === request.assignedTo);

        return { engagement, client, finding, assignedEngineer };
    };

    if (requests.length === 0) {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Retest Queue</h1>
                    <p className="text-muted-foreground mb-8">
                        Client-requested retests appear here for assignment and verification.
                    </p>

                    <Card className="p-12 text-center">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                        <p className="text-sm text-muted-foreground">
                            All retest requests have been completed. New requests from clients will appear here.
                        </p>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Retest Queue</h1>
                        <p className="text-muted-foreground">
                            {requests.length} pending retest request{requests.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {requests.map(request => {
                        const { engagement, client, finding, assignedEngineer } = getRequestDetails(request);
                        const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG['pending'];
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
                                            <Select
                                                onValueChange={(engineerId) => handleAssign(request.id, engineerId)}
                                            >
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
                                            <Button
                                                onClick={() => handleCompleteClick(request)}
                                                className="gap-2"
                                                variant={finding?.status === 'Resolved' ? "secondary" : "default"}
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                {finding?.status === 'Resolved' ? 'Re-verify Status' : 'Update Status'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

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
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Resolved">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                Resolved - Fix Verified
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="In Progress">
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4 text-yellow-600" />
                                                In Progress - Partial Fix
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="Open">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                                Open - Still Vulnerable
                                            </div>
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
                                    <div>
                                        <strong>Still vulnerable:</strong> The client will be notified that the fix was unsuccessful.
                                        Consider providing detailed notes to help them resolve it.
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleComplete}>
                                Confirm Status Update
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
