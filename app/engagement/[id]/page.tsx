'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Edit, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getEngagement, getClient, getServiceProvider, updateEngagement, deleteEngagement } from '@/lib/storage';
import { Engagement, Finding, ReportConfiguration } from '@/lib/types';
import { formatDateRange, calculateFindingStats, sortFindingsBySeverity } from '@/lib/report-utils';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { FindingDialog } from '@/components/forms/finding-dialog';
import { ReportConfigDialog } from '@/components/forms/report-config-dialog';

export default function EngagementDetail() {
    const params = useParams();
    const router = useRouter();
    const engagementId = params.id as string;

    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [client, setClient] = useState<any>(null);
    const [provider, setProvider] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [editingFinding, setEditingFinding] = useState<Finding | null>(null);

    useEffect(() => {
        const eng = getEngagement(engagementId);
        if (!eng) {
            router.push('/');
            return;
        }
        setEngagement(eng);
        setClient(getClient(eng.clientId));
        setProvider(getServiceProvider(eng.serviceProviderId));
    }, [engagementId, router]);

    if (!engagement) {
        return <div>Loading...</div>;
    }

    const stats = calculateFindingStats(engagement.findings);
    const sortedFindings = sortFindingsBySeverity(engagement.findings);

    const handleAddFinding = (finding: Finding) => {
        const updatedFindings = [...engagement.findings, finding];
        const updated = updateEngagement(engagementId, { findings: updatedFindings });
        if (updated) {
            setEngagement(updated);
        }
        setIsDialogOpen(false);
    };

    const handleUpdateFinding = (finding: Finding) => {
        const updatedFindings = engagement.findings.map((f) => (f.id === finding.id ? finding : f));
        const updated = updateEngagement(engagementId, { findings: updatedFindings });
        if (updated) {
            setEngagement(updated);
        }
        setEditingFinding(null);
        setIsDialogOpen(false);
    };

    const handleDeleteFinding = (findingId: string) => {
        if (!confirm('Are you sure you want to delete this finding?')) return;

        const updatedFindings = engagement.findings.filter((f) => f.id !== findingId);
        const updated = updateEngagement(engagementId, { findings: updatedFindings });
        if (updated) {
            setEngagement(updated);
        }
    };

    const handleEditFinding = (finding: Finding) => {
        setEditingFinding(finding);
        setIsDialogOpen(true);
    };

    const handleSaveConfig = (config: ReportConfiguration) => {
        const updated = updateEngagement(engagementId, { reportConfig: config });
        if (updated) {
            setEngagement(updated);
        }
    };

    const handleDeleteEngagement = () => {
        if (!confirm(`Are you sure you want to delete engagement "${engagement.metadata.engagementName}"? This will delete all findings and evidence.`)) {
            return;
        }

        if (deleteEngagement(engagementId)) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>

                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">{engagement.metadata.engagementName}</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            {client?.companyName || 'Unknown Client'} • {engagement.metadata.assessmentType}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            {formatDateRange(engagement.metadata.startDate, engagement.metadata.endDate)}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteEngagement}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Engagement
                        </Button>
                        <Link href={`/engagement/${engagementId}/report`}>
                            <Button>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Report
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Report Config
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-8 grid gap-4 md:grid-cols-6">
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <p className="mt-2 text-2xl font-bold">{stats.total}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Critical</p>
                        <p className="mt-2 text-2xl font-bold text-red-600">{stats.critical}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">High</p>
                        <p className="mt-2 text-2xl font-bold text-orange-600">{stats.high}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Medium</p>
                        <p className="mt-2 text-2xl font-bold text-yellow-600">{stats.medium}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Low</p>
                        <p className="mt-2 text-2xl font-bold text-blue-600">{stats.low}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Info</p>
                        <p className="mt-2 text-2xl font-bold text-gray-600">{stats.informational}</p>
                    </Card>
                </div>

                {/* Findings */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Findings</h2>
                        <Button onClick={() => { setEditingFinding(null); setIsDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Finding
                        </Button>
                    </div>

                    {sortedFindings.length === 0 ? (
                        <Card className="p-12 text-center">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No findings yet</h3>
                            <p className="mt-2 text-muted-foreground">
                                Add your first finding to start building the security report
                            </p>
                            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Finding
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {sortedFindings.map((finding) => (
                                <Card key={finding.id} className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <SeverityBadge severity={finding.severity} />
                                                <h3 className="text-lg font-semibold">{finding.title}</h3>
                                            </div>
                                            {finding.category && (
                                                <p className="mt-2 text-sm text-muted-foreground">{finding.category}</p>
                                            )}
                                            {finding.threatCategory && (
                                                <p className="mt-2 text-sm text-muted-foreground">STRIDE: {finding.threatCategory}</p>
                                            )}
                                            {finding.concernCategory && (
                                                <p className="mt-2 text-sm text-muted-foreground">Concern: {finding.concernCategory}</p>
                                            )}
                                            <p className="mt-2 text-sm">{finding.description.substring(0, 200)}...</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {finding.cvss && (
                                                    <span className="rounded-md bg-muted px-2 py-1 text-xs">
                                                        CVSS: {finding.cvss.baseScore}
                                                    </span>
                                                )}
                                                {finding.affectedAssets && finding.affectedAssets.length > 0 && (
                                                    <span className="rounded-md bg-muted px-2 py-1 text-xs">
                                                        {finding.affectedAssets.length} affected asset{finding.affectedAssets.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {finding.evidenceFiles && finding.evidenceFiles.length > 0 && (
                                                    <span className="rounded-md bg-muted px-2 py-1 text-xs flex items-center gap-1">
                                                        📎 {finding.evidenceFiles.length} evidence
                                                    </span>
                                                )}
                                                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                                                    {finding.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditFinding(finding)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteFinding(finding.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <FindingDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={editingFinding ? handleUpdateFinding : handleAddFinding}
                finding={editingFinding}
                assessmentType={engagement.metadata.assessmentType}
                engagementId={engagementId}
                applicationId={engagement.applicationId}
                clientId={engagement.clientId}
            />

            <ReportConfigDialog
                open={isConfigDialogOpen}
                onOpenChange={setIsConfigDialogOpen}
                engagement={engagement}
                onSave={handleSaveConfig}
            />
        </div>
    );
}
