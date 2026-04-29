'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Engagement, AssessmentType } from '@/lib/types';

interface EditEngagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    engagement: Engagement;
    onSave: (updates: Partial<Engagement['metadata']>) => void;
}

export function EditEngagementDialog({ open, onOpenChange, engagement, onSave }: EditEngagementDialogProps) {
    const [engagementName, setEngagementName] = useState('');
    const [assessmentType, setAssessmentType] = useState<AssessmentType>('Penetration Testing');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (engagement) {
            setEngagementName(engagement.metadata.engagementName);
            setAssessmentType(engagement.metadata.assessmentType as AssessmentType);
            setStartDate(engagement.metadata.startDate);
            setEndDate(engagement.metadata.endDate);
        }
    }, [engagement, open]);

    const handleSave = () => {
        onSave({
            engagementName,
            assessmentType,
            startDate,
            endDate,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Engagement Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label>Engagement Name</Label>
                        <Input value={engagementName} onChange={e => setEngagementName(e.target.value)} />
                    </div>
                    <div>
                        <Label>Assessment Type</Label>
                        <Select value={assessmentType} onValueChange={v => setAssessmentType(v as AssessmentType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Penetration Testing">Penetration Testing</SelectItem>
                                <SelectItem value="Security Assessment">Security Assessment</SelectItem>
                                <SelectItem value="Threat Modeling">Threat Modeling</SelectItem>
                                <SelectItem value="Architecture Review">Architecture Review</SelectItem>
                                <SelectItem value="Secure Code Review">Secure Code Review</SelectItem>
                                <SelectItem value="Compliance Readiness Review">Compliance Readiness Review</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Start Date</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <Label>End Date</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
