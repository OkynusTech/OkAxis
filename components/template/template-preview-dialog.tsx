/**
 * Template Preview Dialog
 * 
 * Modal dialog for previewing templates during selection.
 * Shows full-screen preview with close button.
 */

'use client';

import { ReportTemplate, AssessmentType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplatePreviewer } from './template-previewer';

export interface TemplatePreviewDialogProps {
    template: ReportTemplate | null;
    assessmentType?: AssessmentType;
    onClose: () => void;
}

export function TemplatePreviewDialog({
    template,
    assessmentType,
    onClose
}: TemplatePreviewDialogProps) {
    if (!template) return null;

    return (
        <Dialog open={!!template} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{template.name} Template</DialogTitle>
                </DialogHeader>

                <div className="max-h-[80vh] overflow-y-auto">
                    <TemplatePreviewer
                        mode="selection"
                        template={template}
                        readOnly={true}
                        sampleDataOptions={{
                            assessmentType: assessmentType || 'Penetration Testing',
                            findingsCount: 3
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
