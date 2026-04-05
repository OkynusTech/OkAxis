'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, Trash2, Pencil, Bot, Sparkles, Check, AlertCircle } from 'lucide-react';
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
    getAIPreferences,
    setAIPreferences,
} from '@/lib/storage';
import { checkAvailableProvidersAction } from '@/app/actions/ai-actions';
import { DEFAULT_SERVICE_PROVIDER } from '@/lib/constants';
import { cn } from '@/lib/utils';

type AIProviderType = 'groq' | 'gemini';

interface ProviderStatus {
    provider: AIProviderType;
    available: boolean;
    displayName: string;
}

export default function Settings() {
    const [providers, setProviders] = useState<any[]>([]);
    const [aiProvider, setAiProvider] = useState<AIProviderType>('groq');
    const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
    const [aiStatusLoading, setAiStatusLoading] = useState(true);

    useEffect(() => {
        setProviders(getAllServiceProviders());
        // Load AI preferences
        const prefs = getAIPreferences();
        setAiProvider(prefs.provider);
        // Check which providers are available on the server
        checkAvailableProvidersAction().then(statuses => {
            setProviderStatuses(statuses);
            setAiStatusLoading(false);
        }).catch(() => setAiStatusLoading(false));
    }, []);

    const handleAiProviderChange = (provider: AIProviderType) => {
        setAiProvider(provider);
        setAIPreferences({ provider });
    };
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

                {/* AI Provider Selection */}
                <Card className="mb-8 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">AI Provider</h2>
                            <p className="text-sm text-muted-foreground">Choose which AI backend powers the Template Wizard and AI features</p>
                        </div>
                    </div>

                    {aiStatusLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Checking available providers...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Groq */}
                            {(() => {
                                const groqStatus = providerStatuses.find(p => p.provider === 'groq');
                                const isAvailable = groqStatus?.available ?? false;
                                const isSelected = aiProvider === 'groq';
                                return (
                                    <button
                                        onClick={() => isAvailable && handleAiProviderChange('groq')}
                                        disabled={!isAvailable}
                                        className={cn(
                                            'relative text-left p-5 rounded-xl border-2 transition-all',
                                            isSelected && isAvailable
                                                ? 'border-primary bg-primary/5'
                                                : isAvailable
                                                    ? 'border-border hover:border-primary/50 hover:bg-muted/30'
                                                    : 'border-border opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {isSelected && isAvailable && (
                                            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <Bot className="h-5 w-5 text-orange-500" />
                                            <p className="font-semibold">Groq</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">Llama 3.3 70B — Ultra-fast inference via Groq hardware</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">Fast</span>
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">Open Source Model</span>
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">30 RPM</span>
                                        </div>
                                        {!isAvailable && (
                                            <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-500">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                GROQ_API_KEY not configured in .env.local
                                            </div>
                                        )}
                                    </button>
                                );
                            })()}

                            {/* Gemini */}
                            {(() => {
                                const geminiStatus = providerStatuses.find(p => p.provider === 'gemini');
                                const isAvailable = geminiStatus?.available ?? false;
                                const isSelected = aiProvider === 'gemini';
                                return (
                                    <button
                                        onClick={() => isAvailable && handleAiProviderChange('gemini')}
                                        disabled={!isAvailable}
                                        className={cn(
                                            'relative text-left p-5 rounded-xl border-2 transition-all',
                                            isSelected && isAvailable
                                                ? 'border-primary bg-primary/5'
                                                : isAvailable
                                                    ? 'border-border hover:border-primary/50 hover:bg-muted/30'
                                                    : 'border-border opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {isSelected && isAvailable && (
                                            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <Sparkles className="h-5 w-5 text-blue-500" />
                                            <p className="font-semibold">Google Gemini</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">Gemini 2.5 Flash — Google's fast multimodal model with 250K TPM</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">Larger Context</span>
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">Multimodal</span>
                                            <span className="text-[10px] border rounded-full px-2 py-0.5">5 RPM / 250K TPM</span>
                                        </div>
                                        {!isAvailable && (
                                            <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-500">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                GEMINI_API_KEY not configured in .env.local
                                            </div>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                    )}

                    <p className="mt-4 text-xs text-muted-foreground">
                        The selected provider is used for the AI Template Wizard. Other AI features (text refinement, summaries) currently use Groq.
                        Add your API keys to <code className="px-1 py-0.5 rounded bg-muted text-[11px]">.env.local</code> and restart the server to enable providers.
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
