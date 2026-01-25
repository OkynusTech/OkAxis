'use client';

/**
 * Request Retest Dialog (Client-Side)
 * 
 * Simple workflow: Client requests a retest when they've fixed something.
 * Creates a retest request that appears in provider's queue.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Finding } from '@/lib/types';
import { createRetestRequest } from '@/lib/storage';
import { RefreshCw, Loader2 } from 'lucide-react';

interface RequestRetestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    finding: Finding;
    engagementId: string;
    clientId: string;
    currentUserId: string; // Client User ID
    onSuccess?: () => void;
}

export function RequestRetestDialog({
    open,
    onOpenChange,
    finding,
    engagementId,
    clientId,
    currentUserId,
    onSuccess
}: RequestRetestDialogProps) {
    const [clientNotes, setClientNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            createRetestRequest(
                finding.id,
                engagementId,
                clientId,
                currentUserId,
                clientNotes || undefined
            );

            // Reset form
            setClientNotes('');

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to create retest request:', error);
            alert('Failed to submit retest request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Request Re-test</DialogTitle>
                    <DialogDescription>
                        Request the security team to verify that this issue has been fixed.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Finding Context */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                        <h4 className="font-medium text-sm mb-1">{finding.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{finding.severity}</span>
                            <span>•</span>
                            <span>{finding.status}</span>
                        </div>
                    </div>

                    {/* What Changed */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">What did you fix? (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="e.g., 'Updated authentication flow' or 'Applied latest security patch'"
                            value={clientNotes}
                            onChange={(e) => setClientNotes(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            Help the security team understand what changed so they can verify effectively.
                        </p>
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
                        <strong>What happens next?</strong>
                        <ul className="mt-2 space-y-1 text-muted-foreground text-xs list-disc list-inside">
                            <li>Your request will be added to the security team's queue</li>
                            <li>An engineer will be assigned to verify the fix</li>
                            <li>You'll see the status update when verification is complete</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Request Re-test
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
