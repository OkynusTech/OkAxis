'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Filter, Plus, ArrowLeft, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getAllArtifacts, getAllClients, getAllApplications, getAllEngagements, deleteArtifact } from '@/lib/storage';
import { Artifact, ClientProfile, Application, ArtifactType, ArtifactScope } from '@/lib/types';
import { formatDate } from '@/lib/report-utils';
import { CreateArtifactDialog } from '@/components/forms/create-artifact-dialog';

export default function ArtifactsPage() {
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredArtifacts, setFilteredArtifacts] = useState<Artifact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ArtifactType | 'all'>('all');
    const [scopeFilter, setScopeFilter] = useState<ArtifactScope | 'all'>('all');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [artifacts, searchQuery, typeFilter, scopeFilter]);

    const loadData = () => {
        setArtifacts(getAllArtifacts());
        setClients(getAllClients());
        setApplications(getAllApplications());
    };

    const applyFilters = () => {
        let filtered = [...artifacts];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.name.toLowerCase().includes(query) ||
                a.description?.toLowerCase().includes(query) ||
                a.content?.toLowerCase().includes(query)
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(a => a.type === typeFilter);
        }

        // Scope filter
        if (scopeFilter !== 'all') {
            filtered = filtered.filter(a => a.scope === scopeFilter);
        }

        setFilteredArtifacts(filtered);
    };

    const getScopeName = (artifact: Artifact): string => {
        if (artifact.scope === 'client') {
            const client = clients.find(c => c.id === artifact.scopeId);
            return client ? `Client: ${client.companyName}` : 'Unknown Client';
        } else if (artifact.scope === 'application') {
            const app = applications.find(a => a.id === artifact.scopeId);
            return app ? `App: ${app.name}` : 'Unknown Application';
        } else {
            return `Engagement: ${artifact.scopeId.substring(0, 12)}...`;
        }
    };

    const getTypeColor = (type: ArtifactType): string => {
        const typeColors: Record<ArtifactType, string> = {
            'scope-document': 'bg-blue-100 text-blue-800',
            'architecture-document': 'bg-purple-100 text-purple-800',
            'previous-report': 'bg-gray-100 text-gray-800',
            'walkthrough-video': 'bg-green-100 text-green-800',
            'walkthrough-transcript': 'bg-green-100 text-green-800',
            'evidence-screenshot': 'bg-orange-100 text-orange-800',
            'evidence-network-trace': 'bg-red-100 text-red-800',
            'remediation-plan': 'bg-yellow-100 text-yellow-800',
            'remediation-verification': 'bg-teal-100 text-teal-800',
            'architecture-notes': 'bg-indigo-100 text-indigo-800',
            'annotation-engineer': 'bg-pink-100 text-pink-800',
            'custom-document': 'bg-slate-100 text-slate-800',
        };
        return typeColors[type] || 'bg-gray-600/10 text-gray-600';
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">Knowledge Artifacts</h1>
                        <p className="mt-1 text-muted-foreground">
                            Browse and manage documents, transcripts, and other knowledge artifacts
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/">
                            <Button variant="outline">← Dashboard</Button>
                        </Link>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Artifact
                        </Button>
                    </div>
                </div>

                {/* Info Card */}
                <Card className="mb-8 p-4 border-blue-600 bg-blue-600/5">
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-600">Scoped Knowledge Management</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Artifacts are scoped to Client, Application, or Engagement levels. The knowledge retrieval
                                system uses these scopes to provide relevant context while maintaining strict cross-client isolation.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Stats & Filters */}
                <div className="mb-8">
                    <div className="mb-4 grid gap-4 md:grid-cols-4">
                        <Card className="p-6">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Artifacts</p>
                                <p className="mt-2 text-3xl font-bold">{artifacts.length}</p>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Client-Level</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {artifacts.filter(a => a.scope === 'client').length}
                                </p>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Application-Level</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {artifacts.filter(a => a.scope === 'application').length}
                                </p>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Engagement-Level</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {artifacts.filter(a => a.scope === 'engagement').length}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Search & Filters */}
                    <Card className="p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search artifacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Type Filter */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as ArtifactType | 'all')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="all">All Types</option>
                                <option value="scope-document">Scope Documents</option>
                                <option value="architecture-document">Architecture Documents</option>
                                <option value="previous-report">Previous Reports</option>
                                <option value="walkthrough-video">Walkthrough Videos</option>
                                <option value="walkthrough-transcript">Walkthrough Transcripts</option>
                                <option value="custom-document">Custom Documents</option>
                            </select>

                            {/* Scope Filter */}
                            <select
                                value={scopeFilter}
                                onChange={(e) => setScopeFilter(e.target.value as ArtifactScope | 'all')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="all">All Scopes</option>
                                <option value="client">Client-Level</option>
                                <option value="application">Application-Level</option>
                                <option value="engagement">Engagement-Level</option>
                            </select>
                        </div>
                    </Card>
                </div>

                {/* Artifacts Grid */}
                <div>
                    <h2 className="mb-4 text-2xl font-bold">
                        Artifacts ({filteredArtifacts.length})
                    </h2>

                    {filteredArtifacts.length === 0 ? (
                        <Card className="p-12 text-center">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">
                                {artifacts.length === 0 ? 'No artifacts yet' : 'No matching artifacts'}
                            </h3>
                            <p className="mt-2 text-muted-foreground">
                                {artifacts.length === 0
                                    ? 'Artifacts will be created when you upload documents or videos'
                                    : 'Try adjusting your search or filters'
                                }
                            </p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredArtifacts.map(artifact => (
                                <Card key={artifact.id} className="p-6 transition-colors hover:bg-accent">
                                    <div className="flex items-start justify-between mb-3">
                                        <FileText className="h-6 w-6 text-muted-foreground" />
                                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${getTypeColor(artifact.type)}`}>
                                            {artifact.type.replace(/-/g, ' ')}
                                        </span>
                                    </div>

                                    <h3 className="font-semibold text-lg mb-2">{artifact.name}</h3>

                                    {artifact.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {artifact.description}
                                        </p>
                                    )}

                                    <div className="space-y-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Scope:</span>
                                            <span className="font-medium">{getScopeName(artifact)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Uploaded:</span>
                                            <span>{formatDate(artifact.uploadedAt)}</span>
                                        </div>
                                        {artifact.metadata.transcriptionStatus && (
                                            <div className="flex items-center justify-between">
                                                <span>Transcription:</span>
                                                <span className={`font-medium ${artifact.metadata.transcriptionStatus === 'completed'
                                                    ? 'text-green-600'
                                                    : artifact.metadata.transcriptionStatus === 'failed'
                                                        ? 'text-red-600'
                                                        : 'text-orange-600'
                                                    }`}>
                                                    {artifact.metadata.transcriptionStatus}
                                                </span>
                                            </div>
                                        )}
                                        {artifact.embeddingStatus && (
                                            <div className="flex items-center justify-between">
                                                <span>Embeddings:</span>
                                                <span className={`font-medium ${artifact.embeddingStatus === 'completed'
                                                    ? 'text-green-600'
                                                    : artifact.embeddingStatus === 'failed'
                                                        ? 'text-red-600'
                                                        : 'text-orange-600'
                                                    }`}>
                                                    {artifact.embeddingStatus}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* NEW: Action Buttons */}
                                    <div className="mt-4 flex gap-2 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                // TODO: Implement edit dialog
                                                alert('Edit functionality coming soon!');
                                            }}
                                        >
                                            <Edit className="mr-1 h-3 w-3" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                if (confirm(`Delete artifact "${artifact.name}"?\n\nThis will also remove all embeddings from the vector store.`)) {
                                                    deleteArtifact(artifact.id);
                                                    loadData();
                                                }
                                            }}
                                        >
                                            <Trash2 className="mr-1 h-3 w-3" />
                                            Delete
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreateArtifactDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={loadData}
            />
        </div>
    );
}
