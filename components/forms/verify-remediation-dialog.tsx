'use client';

/**
 * Verify Remediation Dialog (Provider-Side)
 * 
 * Security providers don't fix issues - clients do.
 * This dialog is for VERIFYING client-reported fixes during re-testing.
 * 
 * Workflow:
 * 1. Client reports fix (creates pending-verification event)
 * 2. Provider marks finding for re-test
 * 3. During re-test engagement, provider verifies
 * 4. Updates outcome: successful/failed/partially-successful
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RemediationEvent, RemediationOutcome } from '@/lib/types';
import { verifyRemediationEvent } from '@/lib/storage';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VerifyRemediationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    remediationEvent: RemediationEvent;
    engagementId: string;
    verifiedBy: string; // Engineer ID
    onSuccess?: () => void;
}

const VERIFICATION_OUTCOMES: { value: RemediationOutcome; label: string; icon: any; color: string }[] = [
    { value: 'successful', label: 'Verified - Fix Works', icon: CheckCircle, color: 'text-green-600' },
    { value: 'partially-successful', label: 'Partially Fixed', icon: AlertTriangle, color: 'text-yellow-600' },
    { value: 'failed', label: 'Still Vulnerable', icon: XCircle, color: 'text-red-600' },
];

export function VerifyRemediationDialog({
    open,
    onOpenChange,
    remediationEvent,
    engagementId,
    verifiedBy,
    onSuccess
}: VerifyRemediationDialogProps) {
    const [outcome, setOutcome] = useState<RemediationOutcome>('successful');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [actualEffort, setActualEffort] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVerify = async () => {
        if (!verificationNotes.trim() && outcome !== 'successful') {
            alert('Please provide verification notes explaining the result');
            return;
        }

        setIsSubmitting(true);

        try {
            await verifyRemediationEvent(remediationEvent.id, {
                outcome,
                verifiedBy,
                verificationEngagementId: engagementId,
                verificationNotes: verificationNotes || undefined,
                actualEffort: actualEffort || undefined,
            });

            // Reset form
            setOutcome('successful');
            setVerificationNotes('');
            setActualEffort('');

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to verify remediation:', error);
            alert('Failed to record verification. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedOutcomeConfig = VERIFICATION_OUTCOMES.find(o => o.value === outcome);
    const OutcomeIcon = selectedOutcomeConfig?.icon || CheckCircle;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Verify Client-Reported Fix</DialogTitle>
                    <DialogDescription>
                        Record your re-test results for this remediation attempt.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Client's Fix Description */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                        <h4 className="font-medium text-sm mb-2">What the client reported:</h4>
                        <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Type:</span>
                                <span className="capitalize">{remediationEvent.type.replace(/-/g, ' ')}</span>
                            </div>
                            <div>
                                <span className="font-medium">Description:</span>
                                <p className="mt-1 whitespace-pre-wrap">{remediationEvent.description}</p>
                            </div>
                            {remediationEvent.estimatedEffort && (
                                <div className="mt-2">
                                    <span className="font-medium">Client's Estimate:</span> {remediationEvent.estimatedEffort}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Verification Outcome */}
                    <div className="grid gap-2">
                        <Label htmlFor="outcome">Re-test Result *</Label>
                        <Select value={outcome} onValueChange={(v) => setOutcome(v as RemediationOutcome)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {VERIFICATION_OUTCOMES.map(opt => {
                                    const Icon = opt.icon;
                                    return (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <Icon className={`h-4 w-4 ${opt.color}`} />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Verification Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">
                            Verification Notes {outcome !== 'successful' && '*'}
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder={
                                outcome === 'successful'
                                    ? "Optional notes about the verification..."
                                    : "Required: Explain why the fix failed or what remains..."
                            }
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            rows={4}
                        />
                        {outcome === 'failed' && (
                            <p className="text-xs text-red-600">
                                These notes will be visible to the client to help them try again.
                            </p>
                        )}
                    </div>

                    {/* Actual Effort */}
                    <div className="grid gap-2">
                        <Label htmlFor="effort">Actual Effort to Verify (Optional)</Label>
                        <Select value={actualEffort} onValueChange={setActualEffort}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select time spent..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="< 15 min">Less than 15 minutes</SelectItem>
                                <SelectItem value="15-30 min">15-30 minutes</SelectItem>
                                <SelectItem value="30-60 min">30-60 minutes</SelectItem>
                                <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                                <SelectItem value="2+ hours">2+ hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Guidance based on outcome */}
                    {outcome === 'partially-successful' && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800 text-sm">
                            <strong>Partial Fix:</strong> Explain what worked and what still needs attention in the notes above.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleVerify} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <OutcomeIcon className={`h-4 w-4 ${selectedOutcomeConfig?.color}`} />
                                Record Verification
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
