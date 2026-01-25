'use client';

/**
 * Remediation Dialog Component
 * 
 * Allows engineers to record remediation attempts with full tracking:
 * - Remediation type and description
 * - Effort estimation
 * - Evidence upload
 * - Immediate or deferred verification
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Finding, RemediationType, RemediationOutcome } from '@/lib/types';
import { createRemediationEvent } from '@/lib/storage';
import { CheckCircle, X, Upload, Loader2 } from 'lucide-react';

interface RemediationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    finding: Finding;
    engagementId: string;
    currentUserId: string; // Engineer ID
    onSuccess?: () => void;
}

const REMEDIATION_TYPES: { value: RemediationType; label: string }[] = [
    { value: 'code-fix', label: 'Code Fix' },
    { value: 'config-change', label: 'Configuration Change' },
    { value: 'infrastructure-update', label: 'Infrastructure Update' },
    { value: 'process-change', label: 'Process Change' },
    { value: 'compensating-control', label: 'Compensating Control' },
    { value: 'third-party-patch', label: 'Third-Party Patch' },
    { value: 'dependency-update', label: 'Dependency Update' },
    { value: 'architectural-change', label: 'Architectural Change' },
    { value: 'other', label: 'Other' },
];

const EFFORT_OPTIONS = [
    '< 1 hour',
    '1-2 hours',
    '2-4 hours',
    '4-8 hours',
    '1 day',
    '2-3 days',
    '1 week',
    '2+ weeks'
];

export function RemediationDialog({
    open,
    onOpenChange,
    finding,
    engagementId,
    currentUserId,
    onSuccess
}: RemediationDialogProps) {
    const [type, setType] = useState<RemediationType>('code-fix');
    const [description, setDescription] = useState('');
    const [estimatedEffort, setEstimatedEffort] = useState('');
    const [actualEffort, setActualEffort] = useState('');
    const [outcome, setOutcome] = useState<RemediationOutcome>('pending-verification');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!description.trim()) {
            alert('Please provide a description of the remediation');
            return;
        }

        setIsSubmitting(true);

        try {
            const event = createRemediationEvent(finding.id, engagementId, {
                type,
                description,
                implementedBy: currentUserId,
                implementedAt: new Date().toISOString(),
                outcome,
                estimatedEffort: estimatedEffort || undefined,
                actualEffort: actualEffort || undefined,
                verificationNotes: verificationNotes || undefined,
                metadata: {
                    clientReported: false,
                    automated: false
                }
            });

            // Reset form
            setType('code-fix');
            setDescription('');
            setEstimatedEffort('');
            setActualEffort('');
            setOutcome('pending-verification');
            setVerificationNotes('');

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to create remediation event:', error);
            alert('Failed to record remediation. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Record Remediation Attempt</DialogTitle>
                    <DialogDescription>
                        Document how this finding was addressed. This will be tracked in the remediation history.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Finding Context */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                        <h4 className="font-medium text-sm mb-1">{finding.title}</h4>
                        <p className="text-sm text-muted-foreground">
                            {finding.severity} • {finding.status}
                        </p>
                    </div>

                    {/* Remediation Type */}
                    <div className="grid gap-2">
                        <Label htmlFor="type">Remediation Type *</Label>
                        <Select value={type} onValueChange={(v) => setType(v as RemediationType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {REMEDIATION_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe what was done to remediate this finding..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Effort Tracking */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="estimated">Estimated Effort</Label>
                            <Select value={estimatedEffort} onValueChange={setEstimatedEffort}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EFFORT_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="actual">Actual Effort</Label>
                            <Select value={actualEffort} onValueChange={setActualEffort}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EFFORT_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Outcome */}
                    <div className="grid gap-2">
                        <Label htmlFor="outcome">Outcome Status *</Label>
                        <Select value={outcome} onValueChange={(v) => setOutcome(v as RemediationOutcome)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending-verification">Pending Verification</SelectItem>
                                <SelectItem value="successful">Verified - Successful</SelectItem>
                                <SelectItem value="partially-successful">Verified - Partially Successful</SelectItem>
                                <SelectItem value="failed">Verified - Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Verification Notes (if verified) */}
                    {outcome !== 'pending-verification' && (
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Verification Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="What was the result of verification? Any remaining issues?"
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Record Remediation
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
