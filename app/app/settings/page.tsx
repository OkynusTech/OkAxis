'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    getAllServiceProviders,
    createServiceProvider,
    updateServiceProvider,
    deleteServiceProvider,
    exportData,
    importData,
    clearAllData,
} from '@/lib/storage';
import { DEFAULT_SERVICE_PROVIDER } from '@/lib/constants';

export default function Settings() {
    const [providers, setProviders] = useState<any[]>([]);

    useEffect(() => {
        setProviders(getAllServiceProviders());
    }, []);
    const [showNewProvider, setShowNewProvider] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [legalDisclaimer, setLegalDisclaimer] = useState(DEFAULT_SERVICE_PROVIDER.legalDisclaimer);

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreateProvider = () => {
        if (!companyName || !contactEmail) {
            alert('Company name and contact email are required');
            return;
        }

        const providerData = {
            companyName,
            contactEmail,
            contactPhone,
            website,
            address,
            legalDisclaimer,
            defaultSeverityModel: 'CVSS' as const,
            defaultRemediationTone: 'Balanced' as const,
        };

        if (editingId) {
            if (updateServiceProvider(editingId, providerData)) {
                setEditingId(null);
            } else {
                alert('Failed to update provider');
            }
        } else {
            createServiceProvider(providerData);
        }

        setProviders(getAllServiceProviders());
        setShowNewProvider(false);
        resetForm();
    };

    const handleEditProvider = (provider: any) => {
        setCompanyName(provider.companyName);
        setContactEmail(provider.contactEmail);
        setContactPhone(provider.contactPhone || '');
        setWebsite(provider.website || '');
        setAddress(provider.address || '');
        setLegalDisclaimer(provider.legalDisclaimer);
        setEditingId(provider.id);
        setShowNewProvider(true);
    };

    const resetForm = () => {
        setCompanyName('');
        setContactEmail('');
        setContactPhone('');
        setWebsite('');
        setAddress('');
        setLegalDisclaimer(DEFAULT_SERVICE_PROVIDER.legalDisclaimer);
        setEditingId(null);
    };

    const handleDeleteProvider = (id: string) => {
        if (!confirm('Are you sure you want to delete this service provider?')) return;
        deleteServiceProvider(id);
        setProviders(getAllServiceProviders());
    };

    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-reports-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target?.result as string;
                if (importData(data)) {
                    alert('Data imported successfully');
                    setProviders(getAllServiceProviders());
                } else {
                    alert('Failed to import data. Please check the file format.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleClearAll = () => {
        if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
        if (!confirm('This will delete all engagements, findings, clients, and service providers. Are you absolutely sure?')) return;
        clearAllData();
        setProviders([]);
        alert('All data has been cleared');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>

                <h1 className="mb-8 text-4xl font-bold">Settings</h1>

                {/* Data Management */}
                <Card className="mb-8 p-6">
                    <h2 className="mb-4 text-2xl font-bold">Data Management</h2>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export All Data
                        </Button>
                        <Button onClick={handleImport} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Import Data
                        </Button>
                        <Button onClick={handleClearAll} variant="outline" className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All Data
                        </Button>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Export your data for backup or import previously exported data. All data is stored locally
                        in your browser.
                    </p>
                </Card>

                {/* Service Providers */}
                <Card className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Service Providers</h2>
                        <Button onClick={() => {
                            if (showNewProvider) {
                                setShowNewProvider(false);
                                resetForm();
                            } else {
                                setShowNewProvider(true);
                            }
                        }}>
                            {showNewProvider ? 'Cancel' : 'Add Provider'}
                        </Button>
                    </div>

                    {showNewProvider && (
                        <Card className="mb-6 bg-accent p-6">
                            <h3 className="mb-4 text-lg font-semibold">{editingId ? 'Edit Service Provider' : 'New Service Provider'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <Label>Company Name *</Label>
                                    <Input
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Your Security Company"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Contact Email *</Label>
                                    <Input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="contact@example.com"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Contact Phone</Label>
                                    <Input
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="+1 (555) 123-4567"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Website</Label>
                                    <Input
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="https://example.com"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Address</Label>
                                    <Input
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="123 Security St, City, State, ZIP"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Legal Disclaimer</Label>
                                    <Textarea
                                        value={legalDisclaimer}
                                        onChange={(e) => setLegalDisclaimer(e.target.value)}
                                        className="mt-2"
                                        rows={6}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleCreateProvider}>{editingId ? 'Update Provider' : 'Create Provider'}</Button>
                                    {editingId && (
                                        <Button variant="outline" onClick={() => {
                                            setShowNewProvider(false);
                                            resetForm();
                                        }}>Cancel</Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {providers.length === 0 ? (
                        <p className="text-muted-foreground">
                            No service providers configured. Add one to get started.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {providers.map((provider) => (
                                <Card key={provider.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold">{provider.companyName}</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">{provider.contactEmail}</p>
                                            {provider.website && (
                                                <p className="text-sm text-muted-foreground">{provider.website}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditProvider(provider)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteProvider(provider.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
