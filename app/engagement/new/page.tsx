'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HistoricalContextPanel } from '@/components/forms/historical-context-panel';
import {
    createEngagement,
    createServiceProvider,
    createClient,
    createApplication,
    getAllServiceProviders,
    getAllClients,
    getAllTemplates,
    getAllApplications,
    getAllEngineers,
} from '@/lib/storage';
import { AssessmentType, TemplateType, ReportTemplate } from '@/lib/types';
import { REPORT_TEMPLATES, DEFAULT_SERVICE_PROVIDER, TESTING_METHODOLOGIES } from '@/lib/constants';

export default function NewEngagement() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Service Provider
    const [serviceProviders] = useState(getAllServiceProviders());
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [newProviderName, setNewProviderName] = useState('');
    const [newProviderEmail, setNewProviderEmail] = useState('');

    // Client
    const [clients] = useState(getAllClients());
    const [selectedClientId, setSelectedClientId] = useState('');
    const [newClientName, setNewClientName] = useState('');
    const [newClientIndustry, setNewClientIndustry] = useState('');

    // Application - NEW
    const [applications, setApplications] = useState<any[]>([]);
    const [selectedApplicationId, setSelectedApplicationId] = useState('');
    const [newApplicationName, setNewApplicationName] = useState('');
    const [newApplicationDescription, setNewApplicationDescription] = useState('');

    // Engineers - NEW
    const [allEngineers, setAllEngineers] = useState<any[]>([]);
    const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);

    // Engagement
    const [engagementName, setEngagementName] = useState('');
    const [assessmentType, setAssessmentType] = useState<AssessmentType>('Penetration Testing');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [methodology, setMethodology] = useState('OWASP Testing Guide');
    const [scope, setScope] = useState('');
    const [outOfScope, setOutOfScope] = useState('');
    const [assumptions, setAssumptions] = useState('');
    const [limitations, setLimitations] = useState('');
    const [templateId, setTemplateId] = useState<TemplateType>('enterprise');
    const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([]);

    useEffect(() => {
        setAvailableTemplates(getAllTemplates());
        setAllEngineers(getAllEngineers());
    }, []);

    // Load applications when client is selected
    useEffect(() => {
        if (selectedClientId) {
            const clientApps = getAllApplications().filter((a: any) => a.clientId === selectedClientId);
            setApplications(clientApps);
        } else {
            setApplications([]);
        }
    }, [selectedClientId]);

    const handleCreateEngagement = () => {
        let providerId = selectedProviderId;
        let clientId = selectedClientId;
        let applicationId = selectedApplicationId;

        // Create service provider if new
        if (!providerId && newProviderName) {
            const provider = createServiceProvider({
                ...DEFAULT_SERVICE_PROVIDER,
                companyName: newProviderName,
                contactEmail: newProviderEmail || 'contact@example.com',
            });
            providerId = provider.id;
        }

        // Create client if new
        if (!clientId && newClientName) {
            const client = createClient({
                companyName: newClientName,
                industry: newClientIndustry || 'Technology',
                riskTolerance: 'Medium',
                preferredReportDepth: 'Standard',
            });
            clientId = client.id;
        }

        // Create application if new
        if (!applicationId && newApplicationName && clientId) {
            const app = createApplication({
                clientId: clientId,
                name: newApplicationName,
                description: newApplicationDescription,
            });
            applicationId = app.id;
        }

        if (!providerId || !clientId || !applicationId) {
            alert('Please select or create a service provider, client, and application');
            return;
        }

        const engagement = createEngagement({
            serviceProviderId: providerId,
            clientId: clientId,
            applicationId: applicationId, // NEW
            engineerIds: selectedEngineerIds, // NEW
            metadata: {
                engagementName,
                assessmentType,
                startDate,
                endDate,
                testingMethodology: methodology,
                scope: scope.split('\n').filter((s) => s.trim()),
                outOfScope: outOfScope.split('\n').filter((s) => s.trim()),
                assumptions: assumptions.split('\n').filter((s) => s.trim()),
                limitations: limitations.split('\n').filter((s) => s.trim()),
            },
            findings: [],
            templateId,
            status: 'Draft',
        });

        router.push(`/engagement/${engagement.id}`);
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

                <h1 className="mb-8 text-4xl font-bold">Create New Engagement</h1>

                {/* Progress Steps */}
                <div className="mb-8 flex items-center justify-between">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {s}
                            </div>
                            {s < 5 && <div className={`h-1 w-20 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
                        </div>
                    ))}
                </div>

                <Card className="p-8">
                    {/* Step 1: Service Provider */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Service Provider</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Select Existing Provider</Label>
                                    <Select
                                        value={selectedProviderId}
                                        onChange={(e) => setSelectedProviderId(e.target.value)}
                                        className="mt-2"
                                    >
                                        <option value="">-- Create New --</option>
                                        {serviceProviders.map((sp) => (
                                            <option key={sp.id} value={sp.id}>
                                                {sp.companyName}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                {!selectedProviderId && (
                                    <>
                                        <div>
                                            <Label>Company Name *</Label>
                                            <Input
                                                value={newProviderName}
                                                onChange={(e) => setNewProviderName(e.target.value)}
                                                placeholder="Your Security Company"
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label>Contact Email *</Label>
                                            <Input
                                                type="email"
                                                value={newProviderEmail}
                                                onChange={(e) => setNewProviderEmail(e.target.value)}
                                                placeholder="contact@example.com"
                                                className="mt-2"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedProviderId && !newProviderName}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Client */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Client Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Select Existing Client</Label>
                                    <Select
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        className="mt-2"
                                    >
                                        <option value="">-- Create New --</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.companyName}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                {!selectedClientId && (
                                    <>
                                        <div>
                                            <Label>Company Name *</Label>
                                            <Input
                                                value={newClientName}
                                                onChange={(e) => setNewClientName(e.target.value)}
                                                placeholder="Client Company Name"
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label>Industry</Label>
                                            <Input
                                                value={newClientIndustry}
                                                onChange={(e) => setNewClientIndustry(e.target.value)}
                                                placeholder="e.g., Technology, Finance, Healthcare"
                                                className="mt-2"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setStep(3)}
                                    disabled={!selectedClientId && !newClientName}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Application & Engineers */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Application & Team</h2>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <Label>Select Application *</Label>
                                        <Select
                                            value={selectedApplicationId}
                                            onChange={(e) => setSelectedApplicationId(e.target.value)}
                                            className="mt-2"
                                        >
                                            <option value="">-- Create New --</option>
                                            {applications.map((app) => (
                                                <option key={app.id} value={app.id}>
                                                    {app.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    {!selectedApplicationId && (
                                        <>
                                            <div>
                                                <Label>Application Name *</Label>
                                                <Input
                                                    value={newApplicationName}
                                                    onChange={(e) => setNewApplicationName(e.target.value)}
                                                    placeholder="e.g., Customer Portal"
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div>
                                                <Label>Description</Label>
                                                <Textarea
                                                    value={newApplicationDescription}
                                                    onChange={(e) => setNewApplicationDescription(e.target.value)}
                                                    placeholder="Brief overview of the application"
                                                    className="mt-2"
                                                    rows={3}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="pt-4">
                                        <Label className="mb-2 block">Assigned Engineers</Label>
                                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-3">
                                            {allEngineers.map((engineer) => (
                                                <div key={engineer.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`engineer-${engineer.id}`}
                                                        checked={selectedEngineerIds.includes(engineer.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEngineerIds([...selectedEngineerIds, engineer.id]);
                                                            } else {
                                                                setSelectedEngineerIds(selectedEngineerIds.filter(id => id !== engineer.id));
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <label htmlFor={`engineer-${engineer.id}`} className="text-sm font-medium leading-none">
                                                        {engineer.name}
                                                        <span className="ml-2 text-xs text-muted-foreground">({engineer.role})</span>
                                                    </label>
                                                </div>
                                            ))}
                                            {allEngineers.length === 0 && (
                                                <p className="text-sm text-muted-foreground">No engineers found. Add them in the Engineers dashboard.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {selectedApplicationId ? (
                                        <HistoricalContextPanel applicationId={selectedApplicationId} />
                                    ) : (
                                        <Card className="p-4 border-dashed h-full flex items-center justify-center text-center text-muted-foreground">
                                            <p>Select an application to see historical context and recurring findings.</p>
                                        </Card>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setStep(4)}
                                    disabled={!selectedApplicationId && !newApplicationName}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Engagement Details */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Engagement Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Engagement Name *</Label>
                                    <Input
                                        value={engagementName}
                                        onChange={(e) => setEngagementName(e.target.value)}
                                        placeholder="Q1 2024 Penetration Test"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Assessment Type *</Label>
                                    <Select
                                        value={assessmentType}
                                        onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
                                        className="mt-2"
                                    >
                                        <option value="Penetration Testing">Penetration Testing</option>
                                        <option value="Security Assessment">Security Assessment</option>
                                        <option value="Threat Modeling">Threat Modeling</option>
                                        <option value="Architecture Review">Architecture Review</option>
                                        <option value="Secure Code Review">Secure Code Review</option>
                                        <option value="Compliance Readiness Review">Compliance Readiness Review</option>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Start Date *</Label>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>End Date *</Label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Testing Methodology</Label>
                                    <Select
                                        value={methodology}
                                        onChange={(e) => setMethodology(e.target.value)}
                                        className="mt-2"
                                    >
                                        {TESTING_METHODOLOGIES.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <Label>Scope (one per line)</Label>
                                    <Textarea
                                        value={scope}
                                        onChange={(e) => setScope(e.target.value)}
                                        placeholder="https://example.com&#10;https://api.example.com&#10;Mobile application"
                                        className="mt-2"
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <Label>Out of Scope (one per line)</Label>
                                    <Textarea
                                        value={outOfScope}
                                        onChange={(e) => setOutOfScope(e.target.value)}
                                        placeholder="Production database&#10;Third-party services"
                                        className="mt-2"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Assumptions (one per line)</Label>
                                    <Textarea
                                        value={assumptions}
                                        onChange={(e) => setAssumptions(e.target.value)}
                                        placeholder="Test credentials provided&#10;Testing performed during business hours"
                                        className="mt-2"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Limitations (one per line)</Label>
                                    <Textarea
                                        value={limitations}
                                        onChange={(e) => setLimitations(e.target.value)}
                                        placeholder="Limited to black-box testing&#10;No social engineering"
                                        className="mt-2"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(3)}>
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setStep(5)}
                                    disabled={!engagementName || !startDate || !endDate}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Template Selection */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Select Report Template</h2>
                            <div className="space-y-4">
                                {availableTemplates.map((template) => (
                                    <Card
                                        key={template.id}
                                        className={`cursor-pointer p-4 transition-colors ${templateId === template.id ? 'border-primary bg-accent' : 'hover:bg-accent'
                                            }`}
                                        onClick={() => setTemplateId(template.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold">{template.name}</h3>
                                                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                                            </div>
                                            <div
                                                className={`h-5 w-5 rounded-full border-2 ${templateId === template.id
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                                    }`}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(4)}>
                                    Previous
                                </Button>
                                <Button onClick={handleCreateEngagement}>Create Engagement</Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
