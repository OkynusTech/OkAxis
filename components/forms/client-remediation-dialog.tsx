'use client';

/**
 * Client Remediation Report Dialog
 * 
 * Allows clients to report that they've fixed a finding.
 * Creates a remediation event with 'pending-verification' status
 * that requires engineer verification in next engagement.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Finding, RemediationType } from '@/lib/types';
import { createRemediationEvent } from '@/lib/storage';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientRemediationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    finding: Finding;
    engagementId: string;
    currentUserId: string; // Client User ID
    onSuccess?: () => void;
}

const CLIENT_REMEDIATION_TYPES: { value: RemediationType; label: string }[] = [
    { value: 'code-fix', label: 'Fixed in Code' },
    { value: 'config-change', label: 'Changed Configuration' },
    { value: 'third-party-patch', label: 'Applied Patch/Update' },
    { value: 'process-change', label: 'Updated Process/Policy' },
    { value: 'compensating-control', label: 'Added Compensating Control' },
    { value: 'other', label: 'Other' },
];

export function ClientRemediationDialog({
    open,
    onOpenChange,
    finding,
    engagementId,
    currentUserId,
    onSuccess
}: ClientRemediationDialogProps) {
    const [type, setType] = useState<RemediationType>('code-fix');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!description.trim()) {
            alert('Please describe what you did to fix this issue');
            return;
        }

        setIsSubmitting(true);

        try {
            const event = createRemediationEvent(finding.id, engagementId, {
                type,
                description,
                implementedBy: currentUserId,
                implementedAt: new Date().toISOString(),
                outcome: 'pending-verification',
                metadata: {
                    clientReported: true,
                    automated: false
                }
            });

            // Reset form
            setType('code-fix');
            setDescription('');

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to report remediation:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Report Fix Completion</DialogTitle>
                    <DialogDescription>
                        Let us know that you've addressed this finding. Our team will verify the fix in the next security assessment.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Finding Context */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                        <h4 className="font-medium text-sm mb-1">{finding.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{finding.severity}</span>
                            <span>•</span>
                            <span>{finding.status}</span>
                        </div>
                    </div>

                    {/* Info Alert */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>What happens next?</strong>
                            <p className="text-muted-foreground mt-1">
                                After you submit, our security team will verify your fix during the next assessment.
                                You'll be notified of the verification result.
                            </p>
                        </div>
                    </div>

                    {/* How was it fixed? */}
                    <div className="grid gap-2">
                        <Label htmlFor="type">How did you address this finding? *</Label>
                        <Select value={type} onValueChange={(v) => setType(v as RemediationType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CLIENT_REMEDIATION_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label htmlFor="description">What did you do? *</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the changes you made to fix this issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                        />
                        <p className="text-xs text-muted-foreground">
                            Be specific - this helps our team verify the fix quickly.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Report Fix Completion
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
