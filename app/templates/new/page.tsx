'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportTemplate } from '@/lib/types';
import { TemplateEditor } from '@/components/template/template-editor';
import { TemplatePreviewer } from '@/components/template/template-previewer';
import { AiWizardPanel } from '@/components/template/ai-wizard-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Sparkles, FileText, Copy } from 'lucide-react';
import { createStandardSections } from '@/lib/constants';
import { createTemplate, loadState } from '@/lib/storage';
import { validateTemplateCompleteness } from '@/lib/template-validation';
import { ValidationResult } from '@/lib/types';
import { cn } from '@/lib/utils';

// ── Modes ──────────────────────────────────────────────────────────────────
type StartMode = 'choose' | 'blank' | 'preset' | 'wizard';

function createBlankTemplate(): ReportTemplate {
    return {
        id: 'custom',
        name: 'New Template',
        description: 'Custom template',
        strictnessLevel: 'standard',
        sections: createStandardSections(),
        technicalVerbosity: 'Medium',
        businessLanguageLevel: 'Medium',
        includeCVSS: true,
        includeCWE: false,
        includeOWASP: true,
        branding: {
            showChartsInExecutiveSummary: true,
            showRiskMatrix: false,
        },
    };
}

export default function NewTemplatePage() {
    const router = useRouter();
    const [template, setTemplate] = useState<ReportTemplate>(createBlankTemplate());
    const [isDirty, setIsDirty] = useState(false);
    const [mode, setMode] = useState<StartMode>('choose');

    // Load existing templates for "Start from Preset"
    const existingTemplates = loadState().templates;

    const handleSave = () => {
        const result = validateTemplateCompleteness(template);

        if (result.severity === 'critical' || result.severity === 'error') {
            alert(`Cannot save template:\n\n${result.errors.join('\n')}`);
            return;
        }

        if (result.severity === 'warning' && result.warnings.length > 0) {
            if (!confirm(`Template has warnings:\n\n${result.warnings.join('\n')}\n\nSave anyway?`)) {
                return;
            }
        }

        const saveResult = createTemplate({ ...template, id: '' } as any);

        if (saveResult && 'severity' in saveResult) {
            alert(`Save blocked:\n\n${(saveResult as ValidationResult).errors.join('\n')}`);
            return;
        }

        router.push('/templates');
    };

    const handleTemplateChange = (updated: ReportTemplate) => {
        setTemplate(updated);
        setIsDirty(true);
    };

    /** Called when the AI Wizard finishes generating a template JSON */
    const handleWizardApply = (generated: object) => {
        const base = createBlankTemplate();
        const merged: ReportTemplate = {
            ...base,
            ...(generated as Partial<ReportTemplate>),
            id: 'custom',
            // Ensure sections always exist
            sections: (generated as any).sections?.length
                ? (generated as any).sections
                : base.sections,
        };
        setTemplate(merged);
        setIsDirty(true);
        setMode('blank'); // Switch back to Form Editor with the wizard's output
    };

    // ── Choose Mode Screen ─────────────────────────────────────────────────
    if (mode === 'choose') {
        return (
            <div className="h-screen flex flex-col bg-background">
                <div className="bg-card border-b px-6 py-3 flex items-center gap-4 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">Create New Template</h1>
                        <p className="text-sm text-muted-foreground">Choose how you want to get started</p>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
                        {/* Blank */}
                        <button
                            onClick={() => { setMode('blank'); }}
                            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center"
                        >
                            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <FileText className="h-7 w-7 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Blank Template</p>
                                <p className="text-xs text-muted-foreground mt-1">Start from scratch with an empty form</p>
                            </div>
                        </button>

                        {/* AI Wizard */}
                        <button
                            onClick={() => setMode('wizard')}
                            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-violet-500/5 pointer-events-none" />
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors relative">
                                <Sparkles className="h-7 w-7 text-primary" />
                            </div>
                            <div className="relative">
                                <div className="flex items-center gap-1.5 justify-center mb-1">
                                    <p className="font-semibold text-sm">AI Wizard</p>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-primary rounded-full px-1.5 py-0.5">New</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Chat with AI to design your perfect template</p>
                            </div>
                        </button>

                        {/* From Preset */}
                        <button
                            onClick={() => setMode('preset')}
                            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center"
                        >
                            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Copy className="h-7 w-7 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Copy from Preset</p>
                                <p className="text-xs text-muted-foreground mt-1">Start from an existing saved template</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Preset Picker Screen ────────────────────────────────────────────────
    if (mode === 'preset') {
        return (
            <div className="h-screen flex flex-col bg-background">
                <div className="bg-card border-b px-6 py-3 flex items-center gap-4 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setMode('choose')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">Copy from Preset</h1>
                        <p className="text-sm text-muted-foreground">Select a template to use as a starting point</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {existingTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                            <FileText className="h-12 w-12" />
                            <p>No saved templates yet.</p>
                            <Button variant="outline" onClick={() => setMode('blank')}>Start Blank</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                            {existingTemplates.map((t: ReportTemplate) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTemplate({ ...t, id: 'custom', name: `${t.name} (Copy)` });
                                        setIsDirty(true);
                                        setMode('blank');
                                    }}
                                    className="text-left p-5 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all"
                                >
                                    <p className="font-semibold text-sm">{t.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        <span className="text-[10px] border rounded-full px-2 py-0.5">{t.technicalVerbosity} Technical</span>
                                        <span className="text-[10px] border rounded-full px-2 py-0.5">{t.sections.length} sections</span>
                                        {t.aiGenerated && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">✨ AI Generated</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── AI Wizard Screen ────────────────────────────────────────────────────
    if (mode === 'wizard') {
        return (
            <div className="h-screen flex flex-col bg-background">
                <AiWizardPanel
                    onApplyTemplate={handleWizardApply}
                    onCancel={() => setMode('choose')}
                />
            </div>
        );
    }

    // ── Form Editor + Live Preview (Blank / Post-Wizard) ───────────────────
    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="bg-card border-b px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => setMode('choose')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">{template.name || 'New Template'}</h1>
                            {template.aiGenerated && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                    <Sparkles className="h-3 w-3" />
                                    AI Generated
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">Design a custom report template with live preview</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setMode('wizard')} className="gap-1.5 text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        AI Wizard
                    </Button>
                    <Button onClick={handleSave} disabled={!isDirty}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                    </Button>
                </div>
            </div>

            {/* Split Screen — Form + Live Preview */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Editor */}
                <div className="w-1/2 overflow-y-auto p-8 border-r bg-card">
                    <TemplateEditor
                        template={template}
                        onChange={handleTemplateChange}
                    />
                </div>

                {/* Right: Live Preview */}
                <div className="w-1/2 overflow-y-auto bg-muted/30">
                    <TemplatePreviewer
                        mode="creation"
                        template={template}
                        sampleDataOptions={{
                            assessmentType: 'Penetration Testing',
                            findingsCount: 3
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
