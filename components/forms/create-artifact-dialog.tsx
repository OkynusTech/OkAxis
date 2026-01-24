'use client';

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createArtifact } from '@/lib/storage';
import { getAllClients, getAllApplications, getAllEngagements } from '@/lib/storage';
import { ArtifactType, ArtifactScope, ClientProfile, Application, Engagement } from '@/lib/types';

interface CreateArtifactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    defaultScope?: ArtifactScope;
    defaultScopeId?: string;
}

export function CreateArtifactDialog({
    open,
    onOpenChange,
    onSuccess,
    defaultScope,
    defaultScopeId
}: CreateArtifactDialogProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ArtifactType>('custom-document');
    const [scope, setScope] = useState<ArtifactScope>(defaultScope || 'client');
    const [scopeId, setScopeId] = useState(defaultScopeId || '');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');

    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [engagements, setEngagements] = useState<Engagement[]>([]);

    // Load data
    React.useEffect(() => {
        setClients(getAllClients());
        setApplications(getAllApplications());
        setEngagements(getAllEngagements());
    }, []);

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter artifact name');
            return;
        }

        if (!scopeId.trim()) {
            alert('Please enter scope ID (client ID, application ID, or engagement ID)');
            return;
        }

        if (!content.trim()) {
            alert('Please enter artifact content');
            return;
        }

        createArtifact({
            type,
            scope,
            scopeId: scopeId.trim(),
            name: name.trim(),
            description: description.trim() || undefined,
            content: content.trim(),
            metadata: {},
        });

        // Reset form
        setName('');
        setType('custom-document');
        setScope(defaultScope || 'client');
        setScopeId(defaultScopeId || '');
        setDescription('');
        setContent('');

        onSuccess();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Knowledge Artifact</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Artifact Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="System Architecture Document"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Type *</Label>
                        <Select value={type} onChange={(e) => setType(e.target.value as ArtifactType)} className="mt-2">
                            <option value="scope-document">Scope Document</option>
                            <option value="architecture-document">Architecture Document</option>
                            <option value="previous-report">Previous Report</option>
                            <option value="walkthrough-video">Walkthrough Video</option>
                            <option value="walkthrough-transcript">Walkthrough Transcript</option>
                            <option value="custom-document">Custom Document</option>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Scope Level *</Label>
                            <Select value={scope} onChange={(e) => setScope(e.target.value as ArtifactScope)} className="mt-2">
                                <option value="client">Client-Level</option>
                                <option value="application">Application-Level</option>
                                <option value="engagement">Engagement-Level</option>
                            </Select>
                        </div>

                        <div>
                            {scope === 'client' && (
                                <>
                                    <Label>Select Client *</Label>
                                    <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="mt-2">
                                        <option value="">Choose a client</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.companyName}
                                            </option>
                                        ))}
                                    </Select>
                                </>
                            )}

                            {scope === 'application' && (
                                <>
                                    <Label>Select Application *</Label>
                                    <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="mt-2">
                                        <option value="">Choose an application</option>
                                        {applications.map((app) => (
                                            <option key={app.id} value={app.id}>
                                                {app.name} ({clients.find(c => c.id === app.clientId)?.companyName || 'Unknown Client'})
                                            </option>
                                        ))}
                                    </Select>
                                </>
                            )}

                            {scope === 'engagement' && (
                                <>
                                    <Label>Select Engagement *</Label>
                                    <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="mt-2">
                                        <option value="">Choose an engagement</option>
                                        {engagements.map((eng) => (
                                            <option key={eng.id} value={eng.id}>
                                                {eng.metadata.engagementName}
                                            </option>
                                        ))}
                                    </Select>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this artifact"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Content *</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste the content here (architecture details, scope information, etc.)"
                            className="mt-2"
                            rows={10}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            This content will be used by AI to provide context-aware suggestions
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        <Upload className="mr-2 h-4 w-4" />
                        Add Artifact
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
