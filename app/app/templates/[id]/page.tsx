'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { createTemplate, updateTemplate, getTemplate } from '@/lib/storage';
import { ReportTemplate, ReportSection, ValidationResult, TemplateStrictnessLevel } from '@/lib/types';
import { REPORT_TEMPLATES, BRAND_COLOR_PALETTE, APPROVED_FONTS } from '@/lib/constants';
import { validateTemplateCompleteness, getColorHex } from '@/lib/template-validation';
import { ArrowLeft, ArrowUp, ArrowDown, Save, Plus, Trash2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle, Layout, Type, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownEditor } from '@/components/ui/markdown-editor';

export default function TemplateBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<ReportTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<number | null>(null);
    const [validation, setValidation] = useState<ValidationResult | null>(null);

    const isNew = params.id === 'new';

    useEffect(() => {
        if (isNew) {
            // Initialize new template with 'standard' strictness by default
            const base = REPORT_TEMPLATES['enterprise'];
            const sections: ReportSection[] = JSON.parse(JSON.stringify(base.sections));

            setTemplate({
                id: '',
                name: 'New Template',
                description: '',
                strictnessLevel: 'standard',
                sections: sections,
                technicalVerbosity: 'High',
                businessLanguageLevel: 'High',
                includeCVSS: true,
                includeCWE: true,
                includeOWASP: true,
                branding: {
                    primaryColor: 'default-primary',
                    secondaryColor: 'default-secondary',
                    accentColor: 'default-accent',
                    useEnhancedCover: true,
                    showChartsInExecutiveSummary: true,
                    showRiskMatrix: true,
                }
            });
            setIsLoading(false);
        } else {
            const existing = getTemplate(params.id as string);
            if (existing) {
                if (REPORT_TEMPLATES[existing.id as string]) {
                    alert("System templates are read-only. Please clone it from the list.");
                    router.push('/templates');
                    return;
                }
                setTemplate(existing);
            } else {
                router.push('/templates');
            }
            setIsLoading(false);
        }
    }, [params.id]);

    // Real-time validation on template changes
    useEffect(() => {
        if (template) {
            const result = validateTemplateCompleteness(template);
            setValidation(result);
        }
    }, [template]);

    const handleSave = () => {
        if (!template) return;

        // Validate before save
        const result = validateTemplateCompleteness(template);

        // Block on critical or error
        if (result.severity === 'critical' || result.severity === 'error') {
            alert(`Cannot save template:\n\n${result.errors.join('\n')}`);
            return;
        }

        // Warn but allow
        if (result.severity === 'warning' && result.warnings.length > 0) {
            if (!confirm(`Template has warnings:\n\n${result.warnings.join('\n')}\n\nSave anyway?`)) {
                return;
            }
        }

        const saveResult = isNew
            ? createTemplate({ ...template, id: '' } as any)
            : updateTemplate(template.id as string, template);

        // Check if save returned validation error
        if (saveResult && 'severity' in saveResult) {
            alert(`Save blocked:\n\n${(saveResult as ValidationResult).errors.join('\n')}`);
            return;
        }

        router.push('/templates');
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (!template) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === template.sections.length - 1) return;

        const newSections = [...template.sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

        setTemplate({ ...template, sections: newSections });
    };

    const toggleSection = (index: number, checked: boolean) => {
        if (!template) return;
        const newSections = [...template.sections];
        newSections[index].isVisible = checked;
        setTemplate({ ...template, sections: newSections });
    };

    const addCustomSection = () => {
        if (!template) return;
        const newSection: ReportSection = {
            id: `custom_${Date.now()}`,
            title: 'New Custom Section',
            type: 'custom',
            isVisible: true,
            content: '# Content'
        };
        setTemplate({ ...template, sections: [...template.sections, newSection] });
    };

    const removeSection = (index: number) => {
        if (!template) return;
        const newSections = [...template.sections];
        newSections.splice(index, 1);
        setTemplate({ ...template, sections: newSections });
    };

    const updateSectionTitle = (index: number, title: string) => {
        if (!template) return;
        const newSections = [...template.sections];
        newSections[index].title = title;
        setTemplate({ ...template, sections: newSections });
    };

    if (isLoading || !template) return <div className="p-8">Loading...</div>;

    // Get palette colors as array
    const paletteColors = Object.values(BRAND_COLOR_PALETTE);

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/templates')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{isNew ? 'Configure Template' : 'Edit Template Configuration'}</h1>
                            <p className="text-sm text-muted-foreground">Structure your report output with controlled customization</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Validation Status */}
                        {validation && (
                            <div className="flex items-center gap-2">
                                {validation.severity === 'none' && (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span className="text-sm text-green-600 font-medium">Valid</span>
                                    </>
                                )}
                                {validation.severity === 'warning' && (
                                    <>
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        <span className="text-sm text-amber-600 font-medium">{validation.warnings.length} Warnings</span>
                                    </>
                                )}
                                {(validation.severity === 'error' || validation.severity === 'critical') && (
                                    <>
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                        <span className="text-sm text-red-600 font-medium">{validation.errors.length} Errors</span>
                                    </>
                                )}
                            </div>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={validation?.severity === 'critical' || validation?.severity === 'error'}
                        >
                            <Save className="mr-2 h-4 w-4" /> Save Configuration
                        </Button>
                    </div>
                </div>

                {/* Validation Messages */}
                {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                    <div className="mb-6 space-y-2">
                        {validation.errors.map((error, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-900">{error}</p>
                            </div>
                        ))}
                        {validation.warnings.map((warning, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-900">{warning}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left Column: Configuration Controls */}
                    <div className="space-y-6">
                        {/* General Info */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">General Info</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Template Name</Label>
                                    <Input
                                        value={template.name}
                                        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        value={template.description}
                                        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Strictness Level - Configuration Surface Control */}
                        <Card className="p-6 border-blue-200 bg-blue-50/30">
                            <h2 className="mb-2 text-lg font-semibold">Customization Mode</h2>
                            <p className="text-xs text-muted-foreground mb-4">
                                Controls which configuration options are available
                            </p>
                            <div className="space-y-3">
                                <label className={cn(
                                    "flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all",
                                    template.strictnessLevel === 'standard'
                                        ? "border-blue-500 bg-blue-100/50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}>
                                    <input
                                        type="radio"
                                        name="strictness"
                                        value="standard"
                                        checked={template.strictnessLevel === 'standard'}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            strictnessLevel: e.target.value as TemplateStrictnessLevel,
                                            // Clear advanced options when switching to standard
                                            findingsPresentation: undefined,
                                            visualStyle: undefined,
                                        })}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm">Standard (Recommended)</div>
                                        <div className="text-xs text-muted-foreground">
                                            Conservative defaults, reduced customization surface, safe for all use cases
                                        </div>
                                    </div>
                                </label>

                                <label className={cn(
                                    "flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all",
                                    template.strictnessLevel === 'flexible'
                                        ? "border-amber-500 bg-amber-100/50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}>
                                    <input
                                        type="radio"
                                        name="strictness"
                                        value="flexible"
                                        checked={template.strictnessLevel === 'flexible'}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            strictnessLevel: e.target.value as TemplateStrictnessLevel
                                        })}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            Flexible (Advanced)
                                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Advanced configuration panels, requires layout review, subject to all guardrails
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </Card>

                        {/* Branding Configuration - Available in both modes */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Branding</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">Primary Color</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={template.branding?.primaryColor || 'default-primary'}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            branding: { ...template.branding, primaryColor: e.target.value }
                                        })}
                                    >
                                        {paletteColors.map(color => (
                                            <option key={color.id} value={color.id}>
                                                {color.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: getColorHex(template.branding?.primaryColor) }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {getColorHex(template.branding?.primaryColor)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-2 block">Secondary Color</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={template.branding?.secondaryColor || 'default-secondary'}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            branding: { ...template.branding, secondaryColor: e.target.value }
                                        })}
                                    >
                                        {paletteColors.map(color => (
                                            <option key={color.id} value={color.id}>
                                                {color.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: getColorHex(template.branding?.secondaryColor) }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {getColorHex(template.branding?.secondaryColor)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-2 block">Accent Color</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={template.branding?.accentColor || 'default-accent'}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            branding: { ...template.branding, accentColor: e.target.value }
                                        })}
                                    >
                                        {paletteColors.map(color => (
                                            <option key={color.id} value={color.id}>
                                                {color.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: getColorHex(template.branding?.accentColor) }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {getColorHex(template.branding?.accentColor)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Colors restricted to approved palette for print safety
                                    </p>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <h3 className="text-sm font-semibold">Visual Intelligence</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Enhanced Cover Page</Label>
                                            <p className="text-xs text-muted-foreground">Professional logo-focused layout</p>
                                        </div>
                                        <Switch
                                            checked={template.branding?.useEnhancedCover}
                                            onCheckedChange={(c) => setTemplate({
                                                ...template,
                                                branding: { ...template.branding, useEnhancedCover: c }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Executive Summary Charts</Label>
                                            <p className="text-xs text-muted-foreground">Severity and category distribution</p>
                                        </div>
                                        <Switch
                                            checked={template.branding?.showChartsInExecutiveSummary}
                                            onCheckedChange={(c) => setTemplate({
                                                ...template,
                                                branding: { ...template.branding, showChartsInExecutiveSummary: c }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Risk Matrix</Label>
                                            <p className="text-xs text-muted-foreground">Impact vs Likelihood 2x2 matrix</p>
                                        </div>
                                        <Switch
                                            checked={template.branding?.showRiskMatrix}
                                            onCheckedChange={(c) => setTemplate({
                                                ...template,
                                                branding: { ...template.branding, showRiskMatrix: c }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Cover Page Configuration */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Cover Page Defaults</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Default Title</Label>
                                    <Input
                                        value={template.branding?.coverSettings?.title || ''}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            branding: {
                                                ...template.branding,
                                                coverSettings: { ...template.branding?.coverSettings, title: e.target.value }
                                            }
                                        })}
                                        placeholder="e.g. Security Assessment Report"
                                    />
                                </div>
                                <div>
                                    <Label>Default Subtitle</Label>
                                    <Input
                                        value={template.branding?.coverSettings?.subtitle || ''}
                                        onChange={(e) => setTemplate({
                                            ...template,
                                            branding: {
                                                ...template.branding,
                                                coverSettings: { ...template.branding?.coverSettings, subtitle: e.target.value }
                                            }
                                        })}
                                        placeholder="e.g. Prepared for Client"
                                    />
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Show Client Logo</Label>
                                        <Switch
                                            checked={template.branding?.coverSettings?.showClientLogo ?? true}
                                            onCheckedChange={(c) => setTemplate({
                                                ...template,
                                                branding: {
                                                    ...template.branding,
                                                    coverSettings: { ...template.branding?.coverSettings, showClientLogo: c }
                                                }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show Provider Logo</Label>
                                        <Switch
                                            checked={template.branding?.coverSettings?.showProviderLogo ?? true}
                                            onCheckedChange={(c) => setTemplate({
                                                ...template,
                                                branding: {
                                                    ...template.branding,
                                                    coverSettings: { ...template.branding?.coverSettings, showProviderLogo: c }
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Content Control */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Content & Tone</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Technical Verbosity</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={template.technicalVerbosity}
                                        onChange={(e) => setTemplate({ ...template, technicalVerbosity: e.target.value as any })}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Business Language</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={template.businessLanguageLevel}
                                        onChange={(e) => setTemplate({ ...template, businessLanguageLevel: e.target.value as any })}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Include CVSS Scores</Label>
                                        <Switch
                                            checked={template.includeCVSS}
                                            onCheckedChange={(c) => setTemplate({ ...template, includeCVSS: c })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Include CWE IDs</Label>
                                        <Switch
                                            checked={template.includeCWE}
                                            onCheckedChange={(c) => setTemplate({ ...template, includeCWE: c })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Include OWASP Top 10</Label>
                                        <Switch
                                            checked={template.includeOWASP}
                                            onCheckedChange={(c) => setTemplate({ ...template, includeOWASP: c })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Advanced Controls - Flexible Mode Only */}
                        {template.strictnessLevel === 'flexible' && (
                            <>
                                <Card className="p-6 border-amber-200 bg-amber-50/20">
                                    <h2 className="mb-2 text-lg font-semibold flex items-center gap-2">
                                        Visual Style
                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Advanced</span>
                                    </h2>
                                    <p className="text-xs text-muted-foreground mb-4">Review print output carefully</p>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Font Family</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={template.visualStyle?.fontFamily || 'inter'}
                                                onChange={(e) => setTemplate({
                                                    ...template,
                                                    visualStyle: {
                                                        ...(template.visualStyle || {
                                                            fontFamily: 'inter',
                                                            headingScale: 'comfortable',
                                                            spacingDensity: 'comfortable',
                                                            pageSize: 'Letter',
                                                            showPageNumbers: true,
                                                            showHeaderFooter: true,
                                                        }),
                                                        fontFamily: e.target.value as any
                                                    }
                                                })}
                                            >
                                                {APPROVED_FONTS.map(font => (
                                                    <option key={font.id} value={font.id}>
                                                        {font.name} - {font.description}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Page Size</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={template.visualStyle?.pageSize || 'Letter'}
                                                onChange={(e) => setTemplate({
                                                    ...template,
                                                    visualStyle: {
                                                        ...(template.visualStyle || {
                                                            fontFamily: 'inter',
                                                            headingScale: 'comfortable',
                                                            spacingDensity: 'comfortable',
                                                            pageSize: 'Letter',
                                                            showPageNumbers: true,
                                                            showHeaderFooter: true,
                                                        }),
                                                        pageSize: e.target.value as any
                                                    }
                                                })}
                                            >
                                                <option value="Letter">Letter (8.5" × 11")</option>
                                                <option value="A4">A4 (210mm × 297mm)</option>
                                            </select>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 border-amber-200 bg-amber-50/20">
                                    <h2 className="mb-2 text-lg font-semibold flex items-center gap-2">
                                        Findings Presentation
                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Advanced</span>
                                    </h2>
                                    <p className="text-xs text-muted-foreground mb-4">Configure findings display format</p>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Layout Style</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={template.findingsPresentation?.layout || 'table'}
                                                onChange={(e) => setTemplate({
                                                    ...template,
                                                    findingsPresentation: {
                                                        ...(template.findingsPresentation || {
                                                            layout: 'table',
                                                            severityOrdering: 'critical-first',
                                                            groupBy: 'severity',
                                                            includeCharts: true,
                                                            includeGraphs: true,
                                                        }),
                                                        layout: e.target.value as any
                                                    }
                                                })}
                                            >
                                                <option value="table">Table-based (clear, structured)</option>
                                                <option value="narrative">Narrative (paragraph form)</option>
                                                <option value="hybrid">Hybrid (table + narrative)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Group Findings By</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={template.findingsPresentation?.groupBy || 'severity'}
                                                onChange={(e) => setTemplate({
                                                    ...template,
                                                    findingsPresentation: {
                                                        ...(template.findingsPresentation || {
                                                            layout: 'table',
                                                            severityOrdering: 'critical-first',
                                                            groupBy: 'severity',
                                                            includeCharts: true,
                                                            includeGraphs: true,
                                                        }),
                                                        groupBy: e.target.value as any
                                                    }
                                                })}
                                            >
                                                <option value="severity">Severity Level</option>
                                                <option value="asset">Affected Asset</option>
                                                <option value="category">Vulnerability Category</option>
                                                <option value="none">No Grouping</option>
                                            </select>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Right Column: Report Structure */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Report Structure</h2>
                                <p className="text-sm text-muted-foreground">Configure section order and visibility</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addCustomSection}>
                                <Plus className="mr-2 h-4 w-4" /> Add Custom Section
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {template.sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={cn(
                                        "rounded-lg border bg-card transition-all",
                                        section.type === 'custom' ? "border-blue-200 bg-blue-50/20" : "",
                                        !section.isVisible && "opacity-60 bg-muted/50",
                                        section.isLocked && "border-gray-300 bg-gray-100/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveSection(index, 'up')}
                                                disabled={index === 0}
                                                className="rounded p-1 hover:bg-muted disabled:opacity-30"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => moveSection(index, 'down')}
                                                disabled={index === template.sections.length - 1}
                                                className="rounded p-1 hover:bg-muted disabled:opacity-30"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1">
                                            {section.type === 'custom' ? (
                                                <Input
                                                    value={section.title}
                                                    onChange={(e) => updateSectionTitle(index, e.target.value)}
                                                    className="h-8 font-semibold w-64"
                                                />
                                            ) : (
                                                <span className="font-semibold block">{section.title}</span>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {section.type === 'custom' ? 'Custom Content Block' : 'Standard Component'}
                                                {section.isLocked && ' • Locked'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={section.isVisible}
                                                    onCheckedChange={(c) => toggleSection(index, c)}
                                                />
                                                <Label className="text-xs w-10">{section.isVisible ? "On" : "Off"}</Label>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                                            >
                                                {expandedSection === index ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                            {section.type === 'custom' && (
                                                <Button variant="ghost" size="icon" onClick={() => removeSection(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {expandedSection === index && (
                                        <div className="p-4 border-t bg-background/50">
                                            <Label className="mb-2 block">Default Content (Markdown)</Label>
                                            <MarkdownEditor
                                                value={section.content || ''}
                                                onChange={(val) => {
                                                    const newSections = [...template.sections];
                                                    newSections[index].content = val;
                                                    setTemplate({ ...template, sections: newSections });
                                                }}
                                                minHeight="300px"
                                                placeholder={section.type === 'custom' ? "# Heading..." : "Enter default content overrides here..."}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
