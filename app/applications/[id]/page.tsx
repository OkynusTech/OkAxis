'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Code, Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import {
    getApplication,
    getAllEngagements,
    getClient,
    getArtifactsByScope,
    getAllEngineers
} from '@/lib/storage';
import { Application, Engagement, ClientProfile, Artifact, Engineer } from '@/lib/types';
import { getHistoricalContext, getEngineerRecommendations } from '@/lib/engagement-history';
import { formatDate, calculateFindingStats } from '@/lib/report-utils';

export default function ApplicationDetailPage() {
    const params = useParams();
    const applicationId = params.id as string;

    const [application, setApplication] = useState<Application | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [historicalContext, setHistoricalContext] = useState<any>(null);
    const [engineerRecommendations, setEngineerRecommendations] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [applicationId]);

    const loadData = () => {
        const app = getApplication(applicationId);
        if (!app) return;

        setApplication(app);
        setClient(getClient(app.clientId));

        // Get all engagements for this application
        const allEngagements = getAllEngagements();
        const appEngagements = allEngagements
            .filter(e => e.applicationId === applicationId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEngagements(appEngagements);

        // Get artifacts
        const appArtifacts = getArtifactsByScope('application', applicationId);
        setArtifacts(appArtifacts);

        // Get historical context
        const context = getHistoricalContext(applicationId);
        setHistoricalContext(context);

        // Get engineer recommendations
        const recommendations = getEngineerRecommendations(applicationId);
        setEngineerRecommendations(recommendations);
    };

    if (!application) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Application not found</h2>
                    <Link href="/applications">
                        <Button className="mt-4">← Back to Applications</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/applications">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Applications
                        </Button>
                    </Link>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold">{application.name}</h1>
                            {client && (
                                <p className="mt-2 text-lg text-blue-600 font-medium">{client.companyName}</p>
                            )}
                            {application.description && (
                                <p className="mt-2 text-muted-foreground">{application.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Technology Stack & Auth */}
                {(application.technologyStack || application.authModel) && (
                    <Card className="mb-8 p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {application.technologyStack && application.technologyStack.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                        <Code className="mr-2 h-5 w-5" />
                                        Technology Stack
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {application.technologyStack.map((tech, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center rounded-md bg-blue-600/10 px-3 py-1 text-sm font-medium text-blue-600"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {application.authModel && (
                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center">
                                        <Shield className="mr-2 h-5 w-5" />
                                        Authentication Model
                                    </h3>
                                    <span className="inline-flex items-center rounded-md bg-green-600/10 px-3 py-1 text-sm font-medium text-green-600">
                                        {application.authModel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Historical Context Warning */}
                {historicalContext && historicalContext.recurringVulnerabilityClasses.length > 0 && (
                    <Card className="mb-8 p-4 border-red-600 bg-red-600/5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-600">Recurring Security Issues Detected</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This application has {historicalContext.recurringVulnerabilityClasses.length} vulnerability
                                    class{historicalContext.recurringVulnerabilityClasses.length !== 1 ? 'es' : ''} that have
                                    appeared in multiple engagements.
                                </p>
                                <div className="mt-3 space-y-2">
                                    {historicalContext.recurringVulnerabilityClasses.slice(0, 3).map((pattern: any, idx: number) => (
                                        <div key={idx} className="text-sm">
                                            <span className="font-medium">{pattern.className}</span>
                                            <span className="text-muted-foreground"> - {pattern.occurrences} occurrences across {pattern.engagementIds.length} engagements</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Stats Grid */}
                <div className="mb-8 grid gap-4 md:grid-cols-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Engagements</p>
                                <p className="mt-2 text-3xl font-bold">{engagements.length}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Findings</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {historicalContext?.pastFindings.length || 0}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Artifacts</p>
                                <p className="mt-2 text-3xl font-bold">{artifacts.length}</p>
                            </div>
                            <Code className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Recurring Issues</p>
                                <p className="mt-2 text-3xl font-bold text-red-600">
                                    {historicalContext?.recurringVulnerabilityClasses.length || 0}
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                    </Card>
                </div>

                {/* Engineer Recommendations */}
                {engineerRecommendations.length > 0 && (
                    <Card className="mb-8 p-6">
                        <h2 className="text-xl font-bold mb-4">Recommended Engineers</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Engineers with previous experience on this application (based on exposure, not rankings)
                        </p>
                        <div className="space-y-3">
                            {engineerRecommendations.slice(0, 5).map((rec, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-medium">{rec.engineer.name}</p>
                                        <p className="text-sm text-muted-foreground">{rec.engineer.role}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{rec.reason}</p>
                                        {rec.lastWorkedDate && (
                                            <p className="text-xs text-muted-foreground">
                                                Last: {formatDate(rec.lastWorkedDate)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Engagements History */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Engagement History</h2>

                    {engagements.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No engagements yet</h3>
                            <p className="mt-2 text-muted-foreground">
                                Create your first engagement for this application
                            </p>
                            <Link href="/engagement/new">
                                <Button className="mt-4">Create Engagement</Button>
                            </Link>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {engagements.map(engagement => {
                                const stats = calculateFindingStats(engagement.findings);

                                return (
                                    <Link key={engagement.id} href={`/engagement/${engagement.id}`}>
                                        <Card className="p-6 transition-colors hover:bg-accent cursor-pointer">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold">
                                                        {engagement.metadata.engagementName}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {engagement.metadata.assessmentType} • {formatDate(engagement.metadata.startDate)} - {formatDate(engagement.metadata.endDate)}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {stats.critical > 0 && (
                                                            <SeverityBadge severity="Critical" className="text-xs">
                                                                {stats.critical} Critical
                                                            </SeverityBadge>
                                                        )}
                                                        {stats.high > 0 && (
                                                            <SeverityBadge severity="High" className="text-xs">
                                                                {stats.high} High
                                                            </SeverityBadge>
                                                        )}
                                                        {stats.medium > 0 && (
                                                            <SeverityBadge severity="Medium" className="text-xs">
                                                                {stats.medium} Medium
                                                            </SeverityBadge>
                                                        )}
                                                        {stats.low > 0 && (
                                                            <SeverityBadge severity="Low" className="text-xs">
                                                                {stats.low} Low
                                                            </SeverityBadge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="ml-4 text-right">
                                                    <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                                        {engagement.status}
                                                    </span>
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        {stats.total} finding{stats.total !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Artifacts */}
                {artifacts.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Application Artifacts</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {artifacts.map(artifact => (
                                <Card key={artifact.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold">{artifact.name}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {artifact.type.replace(/-/g, ' ')}
                                            </p>
                                            {artifact.description && (
                                                <p className="text-sm text-muted-foreground mt-2">{artifact.description}</p>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(artifact.uploadedAt)}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
