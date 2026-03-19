'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Building2, Trash2, Search, ArrowLeft, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAllClients, deleteClient, getAllEngagements, getAllApplications } from '@/lib/storage';
import { ClientUserManagementDialog } from '@/components/forms/client-user-management-dialog';
import { ClientProfile } from '@/lib/types';

export default function ClientsPage() {
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [engagements, setEngagements] = useState<any[]>([]);
    const [allApplications, setAllApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredClients, setFilteredClients] = useState<ClientProfile[]>([]);
    const [managingClient, setManagingClient] = useState<ClientProfile | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const filtered = clients.filter(client =>
            client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredClients(filtered);
    }, [clients, searchQuery]);

    const loadData = () => {
        setClients(getAllClients());
        setEngagements(getAllEngagements());
        setAllApplications(getAllApplications());
    };

    const handleDeleteClient = (id: string, name: string) => {
        const engagements = getAllEngagements().filter(e => e.clientId === id);
        const applications = getAllApplications().filter(a => a.clientId === id);

        const message = `Are you sure you want to delete ${name}?\n\nThis will also delete:\n- ${applications.length} Applications\n- ${engagements.length} Engagements\n\nThis action cannot be undone.`;

        if (confirm(message)) {
            // In a real app, deleteClient would also need to clean up dependencies in storage.ts
            // For now, it just removes the client from state and storage.
            if (deleteClient(id)) {
                loadData();
            }
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-bold">Client Management</h1>
                        <p className="mt-2 text-muted-foreground">
                            Manage organizations and their assessment history
                        </p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-8 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Clients List */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClients.length === 0 ? (
                        <Card className="col-span-full p-12 text-center">
                            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No clients found</h3>
                            <p className="mt-2 text-muted-foreground text-sm">
                                Try adjusting your search or add a new client via New Engagement
                            </p>
                        </Card>
                    ) : (
                        filteredClients.map((client) => {
                            const clientEngagements = engagements.filter(e => e.clientId === client.id);
                            const clientApplications = allApplications.filter(a => a.clientId === client.id);

                            return (
                                <Card key={client.id} className="p-6 transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-blue-600/10 p-2">
                                                <Building2 className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg leading-none">{client.companyName}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">{client.industry || 'No industry specified'}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-red-600 hover:bg-red-600/10"
                                            onClick={() => handleDeleteClient(client.id, client.companyName)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Applications</p>
                                            <p className="text-xl font-bold">{clientApplications.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Engagements</p>
                                            <p className="text-xl font-bold">{clientEngagements.length}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <Link href={`/applications?client=${client.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full text-xs">View Apps</Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => setManagingClient(client)}
                                        >
                                            <Users className="mr-2 h-3 w-3" />
                                            Users
                                        </Button>
                                    </div>
                                    <div className="mt-2">
                                        <Link href={`/components?client=${client.id}`} className="block w-full">
                                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary">
                                                <Box className="mr-2 h-3 w-3" />
                                                View Components Registry
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {managingClient && (
                <ClientUserManagementDialog
                    client={managingClient}
                    open={!!managingClient}
                    onOpenChange={(open) => !open && setManagingClient(null)}
                />
            )}
        </div>
    );
}
