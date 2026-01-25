/**
 * Template Creation Page
 * 
 * Split-screen interface:
 * - Left: Template editor
 * - Right: Live preview
 * 
 * Updates preview in real-time as template is edited.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportTemplate } from '@/lib/types';
import { TemplateEditor } from '@/components/template/template-editor';
import { TemplatePreviewer } from '@/components/template/template-previewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { createStandardSections } from '@/lib/constants';

/**
 * Create a blank template for authoring
 */
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
            showRiskMatrix: false
        }
    };
}

export default function NewTemplatePage() {
    const router = useRouter();
    const [template, setTemplate] = useState<ReportTemplate>(createBlankTemplate());
    const [isDirty, setIsDirty] = useState(false);

    const handleSave = () => {
        // TODO: Implement template save
        console.log('Saving template:', template);
        alert('Template saved! (Storage not yet implemented)');
    };

    const handleTemplateChange = (updated: ReportTemplate) => {
        setTemplate(updated);
        setIsDirty(true);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Create New Template</h1>
                        <p className="text-sm text-gray-500">
                            Design a custom report template with live preview
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={!isDirty}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                </Button>
            </div>

            {/* Split Screen */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Editor */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-gray-200 bg-white">
                    <TemplateEditor
                        template={template}
                        onChange={handleTemplateChange}
                    />
                </div>

                {/* Right: Live Preview */}
                <div className="w-1/2 overflow-y-auto bg-gray-100">
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
