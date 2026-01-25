'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FileText,
    Download,
    Search,
    Calendar,
    Filter
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    getAllEngagements,
    getClientUsers,
    getAllClients
} from '@/lib/storage';
import { Engagement, ClientUser } from '@/lib/types';
import { formatDate } from '@/lib/report-utils';

export default function PortalReports() {
    const [user, setUser] = useState<ClientUser | null>(null);
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const storedUserId = localStorage.getItem('ok_portal_user_id');
        if (!storedUserId) return;

        const clients = getAllClients();
        let foundUser: ClientUser | undefined;
        for (const client of clients) {
            const users = getClientUsers(client.id);
            foundUser = users.find(u => u.id === storedUserId);
            if (foundUser) break;
        }

        if (foundUser) {
            setUser(foundUser);
            // Load all non-draft engagements
            const all = getAllEngagements().filter(e =>
                e.clientId === foundUser?.clientId && e.status !== 'Draft'
            );
            setEngagements(all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        }
    }, []);

    const filteredEngagements = engagements.filter(e =>
        e.metadata.engagementName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.metadata.assessmentType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Security Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Access and download your assessment reports and deliverables.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {(filteredEngagements.length === 0 && !searchTerm) ? (
                    // Sample Reports for Demo
                    <>
                        <Card className="p-6 transition-all hover:shadow-md border-l-4 border-l-blue-600 bg-white dark:bg-slate-900 dark:border-slate-800">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-lg hidden sm:block">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                                Quarterly Security Assessment - Q4 2025
                                            </h3>
                                            <Badge variant="secondary" className="font-normal">
                                                Periodic Assessment
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Dec 15, 2025
                                            </span>
                                            <span>•</span>
                                            <span>12 findings</span>
                                            <span className="text-green-600 font-medium">
                                                (All Resolved)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                                    <Button variant="outline" size="sm" disabled>
                                        View Online
                                    </Button>
                                    <Button size="sm" disabled>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download PDF
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <div className="text-center mt-8 p-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-slate-500">
                                Real reports will appear here once engagements are completed and published.
                            </p>
                        </div>
                    </>
                ) : filteredEngagements.length === 0 ? (
                    <Card className="p-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-medium text-slate-900">No reports found matching search</h3>
                        <p className="mt-2 text-slate-500">
                            Try adjusting your filters.
                        </p>
                    </Card>
                ) : (
                    filteredEngagements.map(eng => {
                        const findingCount = eng.findings.length;
                        const criticalCount = eng.findings.filter(f => f.severity === 'Critical' && ['Open', 'In Progress'].includes(f.status)).length;

                        return (
                            <Card key={eng.id} className="p-6 transition-all hover:shadow-md bg-white dark:bg-slate-900 dark:border-slate-800">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg hidden sm:block">
                                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                                    {eng.metadata.engagementName}
                                                </h3>
                                                <Badge variant="secondary" className="font-normal">
                                                    {eng.metadata.assessmentType}
                                                </Badge>
                                                <Badge variant="outline" className="font-mono text-xs border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                                                    v{eng.version || 1}.0
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(eng.metadata.endDate)}
                                                </span>
                                                <span>•</span>
                                                <span>{findingCount} findings</span>
                                                {criticalCount > 0 && (
                                                    <span className="text-red-600 font-medium">
                                                        ({criticalCount} Critical Open)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                                        <Link href={`/engagement/${eng.id}/report?view=client`} target="_blank">
                                            <Button variant="outline" size="sm">
                                                View Online
                                            </Button>
                                        </Link>
                                        <Button size="sm">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download PDF
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
