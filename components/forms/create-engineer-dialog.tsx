'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createEngineer } from '@/lib/storage';

interface CreateEngineerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateEngineerDialog({ open, onOpenChange, onSuccess }: CreateEngineerDialogProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter engineer name');
            return;
        }

        createEngineer({
            name: name.trim(),
            email: email.trim() || '',
            role: role.trim() || 'Security Engineer',
            exposure: {
                vulnerabilityClasses: [],
                applicationTypes: [],
                authModels: [],
                totalEngagements: 0,
            },
        });

        // Reset form
        setName('');
        setEmail('');
        setRole('');

        onSuccess();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Engineer</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Role</Label>
                        <Input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="Security Engineer"
                            className="mt-2"
                        />
                    </div>

                    <p className="text-xs text-gray-600">
                        Exposure tracking (vulnerability classes, application types) will be automatically updated as this engineer works on engagements.
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        Add Engineer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
