'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Component, ComponentType, TrustZone, Finding, SeverityLevel, Application, ClientProfile } from '@/lib/types';
import {
    getAllComponents,
    getComponentsByApplication,
    getComponentsByClient,
    getComponentsByEngagement,
    getAllApplications,
    getAllClients,
    getAllEngagements,
    getEngagementById,
    getComponentStats
} from '@/lib/storage';
import { ComponentCard } from '@/components/components/component-card';
import { ComponentDetailDialog } from '@/components/components/component-detail-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Shield, Search, Filter } from 'lucide-react';

type ScopeLevel = 'all' | 'client' | 'application' | 'engagement';

function ComponentsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [scopeLevel, setScopeLevel] = useState<ScopeLevel>('all');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedApplicationId, setSelectedApplicationId] = useState('');
    const [selectedEngagementId, setSelectedEngagementId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ComponentType | 'all'>('all');
    const [filterTrustZone, setFilterTrustZone] = useState<TrustZone | 'all'>('all');
    const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Data
    const [components, setComponents] = useState<Component[]>([]);
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [engagements, setEngagements] = useState<any[]>([]);
    const [allFindings, setAllFindings] = useState<Finding[]>([]);

    // Load initial data and params
    useEffect(() => {
        setClients(getAllClients());
        setApplications(getAllApplications());
        setEngagements(getAllEngagements());

        // Handle URL params
        const clientParam = searchParams.get('client');
        const appParam = searchParams.get('application');
        const engageParam = searchParams.get('engagement');

        if (clientParam) {
            setScopeLevel('client');
            setSelectedClientId(clientParam);
        } else if (appParam) {
            setScopeLevel('application');
            setSelectedApplicationId(appParam);
        } else if (engageParam) {
            setScopeLevel('engagement');
            setSelectedEngagementId(engageParam);
        }
    }, [searchParams]);

    // Load components based on scope
    useEffect(() => {
        let loadedComponents: Component[] = [];
        let findings: Finding[] = [];

        switch (scopeLevel) {
            case 'client':
                if (selectedClientId) {
                    loadedComponents = getComponentsByClient(selectedClientId);
                    // Get all findings from this client's engagements
                    const clientEngagements = getAllEngagements().filter(e => e.clientId === selectedClientId);
                    findings = clientEngagements.flatMap(e => e.findings);
                }
                break;
            case 'application':
                if (selectedApplicationId) {
                    loadedComponents = getComponentsByApplication(selectedApplicationId);
                    // Get all findings from this application's engagements
                    const appEngagements = getAllEngagements().filter(e => e.applicationId === selectedApplicationId);
                    findings = appEngagements.flatMap(e => e.findings);
                }
                break;
            case 'engagement':
                if (selectedEngagementId) {
                    loadedComponents = getComponentsByEngagement(selectedEngagementId);
                    const engagement = getEngagementById(selectedEngagementId);
                    findings = engagement?.findings || [];
                }
                break;
            default:
                loadedComponents = getAllComponents();
                findings = getAllEngagements().flatMap(e => e.findings);
        }

        setComponents(loadedComponents);
        setAllFindings(findings);
    }, [scopeLevel, selectedClientId, selectedApplicationId, selectedEngagementId, refreshTrigger]);

    // Filter components
    const filteredComponents = components.filter(comp => {
        // Search filter
        if (searchTerm && !comp.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Type filter
        if (filterType !== 'all' && comp.type !== filterType) {
            return false;
        }

        // Trust zone filter
        if (filterTrustZone !== 'all' && comp.trustZone !== filterTrustZone) {
            return false;
        }

        return true;
    });

    // Get component finding info
    const getComponentInfo = (component: Component) => {
        const linkedFindings = allFindings.filter(f => component.findingIds.includes(f.id!));
        const findingCount = linkedFindings.length;
        const highestSeverity = linkedFindings.reduce<SeverityLevel | undefined>((highest, f) => {
            const severities: SeverityLevel[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
            if (!highest) return f.severity;
            return severities.indexOf(f.severity) < severities.indexOf(highest) ? f.severity : highest;
        }, undefined);

        return { findingCount, highestSeverity };
    };

    const stats = getComponentStats(filteredComponents);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="h-8 w-8 text-primary" />
                        <h1 className="text-4xl font-bold">Components Registry</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Track application components extracted from security findings
                    </p>
                </div>

                {/* Filters */}
                <Card className="p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Scope Level */}
                        <div>
                            <Label>Scope Level</Label>
                            <Select
                                value={scopeLevel}
                                onValueChange={(v) => {
                                    setScopeLevel(v as ScopeLevel);
                                    setSelectedClientId('');
                                    setSelectedApplicationId('');
                                    setSelectedEngagementId('');
                                }}
                            >
                                <SelectTrigger className="mt-2 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Components</SelectItem>
                                    <SelectItem value="client">By Client</SelectItem>
                                    <SelectItem value="application">By Application</SelectItem>
                                    <SelectItem value="engagement">By Engagement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Client Selector */}
                        {scopeLevel === 'client' && (
                            <div>
                                <Label>Client</Label>
                                <Select
                                    value={selectedClientId}
                                    onValueChange={setSelectedClientId}
                                >
                                    <SelectTrigger className="mt-2 w-full">
                                        <SelectValue placeholder="Select Client..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Application Selector */}
                        {scopeLevel === 'application' && (
                            <div>
                                <Label>Application</Label>
                                <Select
                                    value={selectedApplicationId}
                                    onValueChange={setSelectedApplicationId}
                                >
                                    <SelectTrigger className="mt-2 w-full">
                                        <SelectValue placeholder="Select Application..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {applications.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Engagement Selector */}
                        {scopeLevel === 'engagement' && (
                            <div>
                                <Label>Engagement</Label>
                                <Select
                                    value={selectedEngagementId}
                                    onValueChange={setSelectedEngagementId}
                                >
                                    <SelectTrigger className="mt-2 w-full">
                                        <SelectValue placeholder="Select Engagement..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {engagements.map(e => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.metadata?.engagementName || `Engagement ${e.id.slice(0, 8)}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Component Type Filter */}
                        <div>
                            <Label>Component Type</Label>
                            <Select
                                value={filterType}
                                onValueChange={(v) => setFilterType(v as ComponentType | 'all')}
                            >
                                <SelectTrigger className="mt-2 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="endpoint">Endpoints</SelectItem>
                                    <SelectItem value="service">Services</SelectItem>
                                    <SelectItem value="database">Databases</SelectItem>
                                    <SelectItem value="file">Files</SelectItem>
                                    <SelectItem value="external-api">External APIs</SelectItem>
                                    <SelectItem value="frontend">Frontend</SelectItem>
                                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Trust Zone Filter */}
                        <div>
                            <Label>Trust Zone</Label>
                            <Select
                                value={filterTrustZone}
                                onValueChange={(v) => setFilterTrustZone(v as TrustZone | 'all')}
                            >
                                <SelectTrigger className="mt-2 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Zones</SelectItem>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="authenticated">Authenticated</SelectItem>
                                    <SelectItem value="internal">Internal</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="database">Database</SelectItem>
                                    <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search components by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card className="p-4">
                        <div className="text-2xl font-bold">{stats.totalComponents}</div>
                        <div className="text-sm text-muted-foreground">Total Components</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold">{stats.componentsWithFindings}</div>
                        <div className="text-sm text-muted-foreground">With Findings</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold">{stats.byType?.endpoint || 0}</div>
                        <div className="text-sm text-muted-foreground">Endpoints</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold">{stats.byTrustZone?.public || 0}</div>
                        <div className="text-sm text-muted-foreground">Public (Internet-Facing)</div>
                    </Card>
                </div>

                {/* Components Grid */}
                {filteredComponents.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            {components.length === 0
                                ? 'No components found. Components are automatically extracted when you save findings.'
                                : 'No components match your search criteria.'}
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredComponents.map((component) => {
                            const { findingCount, highestSeverity } = getComponentInfo(component);

                            return (
                                <ComponentCard
                                    key={component.id}
                                    component={component}
                                    findingCount={findingCount}
                                    highestSeverity={highestSeverity}
                                    onClick={() => setSelectedComponent(component)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Dialog */}
            <ComponentDetailDialog
                component={selectedComponent}
                findings={allFindings}
                onClose={() => setSelectedComponent(null)}
                onDelete={() => {
                    setRefreshTrigger(prev => prev + 1);
                    setSelectedComponent(null);
                }}
            />
        </div>
    );
}

export default function ComponentsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading Components Registry...</div>}>
            <ComponentsContent />
        </Suspense>
    );
}
