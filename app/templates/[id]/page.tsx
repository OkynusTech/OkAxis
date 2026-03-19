'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateTemplate, getTemplate } from '@/lib/storage';
import { ReportTemplate, ValidationResult } from '@/lib/types';
import { validateTemplateCompleteness } from '@/lib/template-validation';
import { ArrowLeft, Save, FileText, Sparkles } from 'lucide-react';
import { TemplateEditor } from '@/components/template/template-editor';
import { TemplatePreviewer } from '@/components/template/template-previewer';

export default function TemplateBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<ReportTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const id = params.id as string;
        if (id === 'new') {
            // New is handled by /templates/new/page.tsx now
            router.replace('/templates/new');
            return;
        }

        const existing = getTemplate(id);
        if (existing) {
            setTemplate(existing);
        } else {
            router.push('/templates');
        }
        setIsLoading(false);
    }, [params.id, router]);

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

        const saveResult = updateTemplate(template.id as string, template);

        // Check if save returned validation error
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

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-gray-50/50">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <FileText className="h-8 w-8 animate-pulse text-primary/50" />
                <span className="text-sm font-medium">Loading Template...</span>
            </div>
        </div>
    );

    if (!template) return null;

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="bg-card border-b px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/templates')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">{template.name || 'Edit Template'}</h1>
                            {template.aiGenerated && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                    <Sparkles className="h-3 w-3" />
                                    AI Generated
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">Modify template properties and view live preview</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSave} disabled={!isDirty}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
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
