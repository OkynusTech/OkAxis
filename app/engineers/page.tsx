'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAllEngineers, getAllEngagements } from '@/lib/storage';
import { Engineer, Engagement } from '@/lib/types';
import { formatDate } from '@/lib/report-utils';
import { getFindingsCountByEngineer } from '@/lib/engineer-helpers';
import { CreateEngineerDialog } from '@/components/forms/create-engineer-dialog';

export default function EngineersPage() {
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setEngineers(getAllEngineers());
        setEngagements(getAllEngagements());
    };

    const getEngagementCount = (engineerId: string): number => {
        return engagements.filter(e => e.engineerIds?.includes(engineerId)).length;
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">Engineers</h1>
                        <p className="mt-1 text-muted-foreground">
                            Manage team members and track engagement exposure
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/">
                            <Button variant="outline">← Dashboard</Button>
                        </Link>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Engineer
                        </Button>
                    </div>
                </div>

                {/* Info Card */}
                <Card className="mb-8 p-4 border-blue-600 bg-blue-600/5">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-600">Exposure Tracking, Not Rankings</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Engineer profiles track historical exposure to vulnerability classes, application types,
                                and authentication models. This is for context and continuity, NOT performance evaluation or skill scoring.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Stats */}
                <div className="mb-8 grid gap-4 md:grid-cols-3">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Engineers</p>
                                <p className="mt-2 text-3xl font-bold">{engineers.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </Card>
                </div>

                {/* Engineers List */}
                <div>
                    <h2 className="mb-4 text-2xl font-bold">Team Members</h2>

                    {engineers.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No engineers yet</h3>
                            <p className="mt-2 text-muted-foreground">
                                Engineers will be tracked automatically when assigned to engagements
                            </p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {engineers.map(engineer => {
                                const engagementCount = getEngagementCount(engineer.id);

                                return (
                                    <Link key={engineer.id} href={`/engineers/${engineer.id}`}>
                                        <Card className="p-6 h-full transition-colors hover:bg-accent cursor-pointer">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-full bg-blue-600 p-3">
                                                    <Users className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{engineer.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{engineer.role}</p>
                                                    {engineer.email && (
                                                        <p className="text-xs text-muted-foreground mt-1">{engineer.email}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Engagements</span>
                                                    <span className="font-medium">{engagementCount}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Findings Discovered</span>
                                                    <span className="font-medium">{getFindingsCountByEngineer(engineer.id)}</span>
                                                </div>

                                                {engineer.exposure.vulnerabilityClasses.length > 0 && (
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground">Exposure: </span>
                                                        <span className="font-medium">
                                                            {engineer.exposure.vulnerabilityClasses.length} vuln classes
                                                        </span>
                                                    </div>
                                                )}

                                                {engineer.exposure.lastEngagementDate && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Last: {formatDate(engineer.exposure.lastEngagementDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <CreateEngineerDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={loadData}
            />
        </div>
    );
}
