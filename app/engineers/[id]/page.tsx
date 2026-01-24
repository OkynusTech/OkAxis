'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Users, Shield, Code, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getEngineer, getAllEngagements, getApplication } from '@/lib/storage';
import { Engineer, Engagement, Finding } from '@/lib/types';
import { formatDate } from '@/lib/report-utils';
import { getFindingsByEngineer, getFindingsSeverityBreakdown } from '@/lib/engineer-helpers';

export default function EngineerDetailPage() {
    const params = useParams();
    const engineerId = params.id as string;

    const [engineer, setEngineer] = useState<Engineer | null>(null);
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [findings, setFindings] = useState<Finding[]>([]);

    useEffect(() => {
        loadData();
    }, [engineerId]);

    const loadData = () => {
        const eng = getEngineer(engineerId);
        if (!eng) return;

        setEngineer(eng);

        // Get all engagements this engineer worked on
        const allEngagements = getAllEngagements();
        const engineerEngagements = allEngagements
            .filter(e => e.engineerIds?.includes(engineerId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEngagements(engineerEngagements);

        // Get findings discovered by this engineer
        const engineerFindings = getFindingsByEngineer(engineerId);
        setFindings(engineerFindings);
    };

    if (!engineer) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Engineer not found</h2>
                    <Link href="/engineers">
                        <Button className="mt-4">← Back to Engineers</Button>
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
                    <Link href="/engineers">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Engineers
                        </Button>
                    </Link>

                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-blue-600 p-4">
                            <Users className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold">{engineer.name}</h1>
                            <p className="mt-2 text-lg text-muted-foreground">{engineer.role}</p>
                            {engineer.email && (
                                <p className="mt-1 text-muted-foreground">{engineer.email}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Exposure Warning */}
                <Card className="mb-8 p-4 border-blue-600 bg-blue-600/5">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-600">Exposure Tracking Only</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                This page shows historical exposure to vulnerability types and application architectures.
                                These metrics are for team continuity and NOT for performance evaluation or skill ranking.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Stats */}
                <div className="mb-8 grid gap-4 md:grid-cols-3">
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
                                <p className="text-sm font-medium text-muted-foreground">Vulnerability Classes</p>
                                <p className="mt-2 text-3xl font-bold">{engineer.exposure.vulnerabilityClasses.length}</p>
                            </div>
                            <Shield className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Application Types</p>
                                <p className="mt-2 text-3xl font-bold">{engineer.exposure.applicationTypes.length}</p>
                            </div>
                            <Code className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Findings Discovered</p>
                                <p className="mt-2 text-3xl font-bold">{findings.length}</p>
                            </div>
                            <Shield className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>
                </div>

                {/* Findings Discovered Section */}
                {findings.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Findings Discovered</h2>

                        {/* Severity Breakdown */}
                        <div className="grid grid-cols-5 gap-3 mb-6">
                            {Object.entries(getFindingsSeverityBreakdown(engineerId)).map(([severity, count]) => (
                                count > 0 && (
                                    <Card key={severity} className="p-4">
                                        <p className="text-xs font-medium text-muted-foreground">{severity}</p>
                                        <p className="text-2xl font-bold mt-1">{count}</p>
                                    </Card>
                                )
                            ))}
                        </div>

                        {/* Findings List */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {findings.map(finding => (
                                <Card key={finding.id} className="p-4 hover:bg-accent transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-sm">{finding.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${finding.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                            finding.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                                                finding.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}>
                                            {finding.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                        {finding.description}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Discovered: {formatDate(finding.discoveryDate)}</span>
                                        <span className={`px-2 py-1 rounded ${finding.status === 'Fixed' ? 'bg-green-100 text-green-800' :
                                            finding.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {finding.status}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Exposure Details */}
            <div className="mb-8 grid gap-6 md:grid-cols-2">
                {/* Vulnerability Classes */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                        <Shield className="mr-2 h-5 w-5" />
                        Vulnerability Class Exposure
                    </h3>
                    {engineer.exposure.vulnerabilityClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No exposure data yet</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {engineer.exposure.vulnerabilityClasses.map((vulnClass, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-red-600/10 px-3 py-1 text-sm font-medium text-red-600"
                                >
                                    {vulnClass}
                                </span>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Application Types */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                        <Code className="mr-2 h-5 w-5" />
                        Application Type Exposure
                    </h3>
                    {engineer.exposure.applicationTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No exposure data yet</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {engineer.exposure.applicationTypes.map((appType, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-blue-600/10 px-3 py-1 text-sm font-medium text-blue-600"
                                >
                                    {appType}
                                </span>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Auth Models */}
                {engineer.exposure.authModels.length > 0 && (
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center">
                            <Shield className="mr-2 h-5 w-5" />
                            Authentication Model Exposure
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {engineer.exposure.authModels.map((authModel, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-green-600/10 px-3 py-1 text-sm font-medium text-green-600"
                                >
                                    {authModel}
                                </span>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Engagement History */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Engagement History</h2>

                {engagements.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No engagements yet</h3>
                        <p className="mt-2 text-muted-foreground">
                            This engineer hasn't been assigned to any engagements
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {engagements.map(engagement => {
                            const app = engagement.applicationId ? getApplication(engagement.applicationId) : null;

                            return (
                                <Link key={engagement.id} href={`/engagement/${engagement.id}`}>
                                    <Card className="p-6 transition-colors hover:bg-accent cursor-pointer">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold">
                                                    {engagement.metadata.engagementName}
                                                </h3>
                                                {app && (
                                                    <p className="mt-1 text-sm text-blue-600 font-medium">
                                                        {app.name}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {engagement.metadata.assessmentType} • {formatDate(engagement.metadata.startDate)}
                                                </p>
                                            </div>

                                            <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                                {engagement.status}
                                            </span>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
