/**
 * Template Previewer Component
 * 
 * Unified preview component for three use cases:
 * 1. Template Selection (read-only preview during engagement creation)
 * 2. Template Creation (live preview while authoring new templates)
 * 3. Report Config Editing (live preview with section highlighting)
 * 
 * CRITICAL: This component uses ReportRenderer for 100% WYSIWYG fidelity.
 * Preview output MUST match final PDF output exactly.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ReportTemplate, ReportConfig } from '@/lib/types';
import { ReportRenderer } from '@/components/report/report-renderer';
import { generateSampleEngagement, SampleDataOptions } from '@/lib/sample-data-generator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PreviewMode = 'selection' | 'creation' | 'editing';

export interface TemplatePreviewerProps {
    mode: PreviewMode;
    template: ReportTemplate;
    reportConfig?: ReportConfig; // Optional override for editing mode
    onChange?: (template: ReportTemplate) => void; // For creation mode
    highlightedSections?: string[]; // For editing mode - sections that changed
    readOnly?: boolean; // Force read-only
    sampleDataOptions?: Partial<SampleDataOptions>;
    className?: string;
}

interface ValidationError {
    severity: 'error' | 'warning' | 'info';
    message: string;
    sectionId?: string;
}

/**
 * Template Previewer
 * 
 * Pure preview component - no editing controls, just rendering.
 * Editing happens in parent component, this only displays.
 */
export function TemplatePreviewer({
    mode,
    template,
    reportConfig,
    onChange,
    highlightedSections = [],
    readOnly = false,
    sampleDataOptions,
    className
}: TemplatePreviewerProps) {
    // Generate sample data
    const sampleData = useMemo(() => {
        return generateSampleEngagement({
            assessmentType: sampleDataOptions?.assessmentType || 'Penetration Testing',
            clientName: sampleDataOptions?.clientName,
            applicationName: sampleDataOptions?.applicationName,
            findingsCount: sampleDataOptions?.findingsCount || 3,
            includeSeverities: sampleDataOptions?.includeSeverities
        });
    }, [sampleDataOptions]);

    // Validate template
    const validationErrors = useMemo(() =>
        validateTemplate(template, reportConfig),
        [template, reportConfig]
    );

    // Track if template has changed (for performance)
    const [lastTemplate, setLastTemplate] = useState(template);
    const hasChanged = lastTemplate.id !== template.id ||
        lastTemplate.sections.length !== template.sections.length;

    useEffect(() => {
        if (hasChanged) {
            setLastTemplate(template);
        }
    }, [template, hasChanged]);

    return (
        <div className={cn('template-previewer', className)}>
            {/* Preview Header (hidden in selection mode) */}
            {mode !== 'selection' && (
                <PreviewHeader
                    mode={mode}
                    template={template}
                    validationErrors={validationErrors}
                />
            )}

            {/* Main Preview */}
            <div className={cn(
                'preview-content bg-gray-50 min-h-screen py-8',
                mode === 'selection' && 'rounded-lg border border-gray-200'
            )}>
                <div className="mx-auto max-w-[850px] bg-white text-black shadow-lg px-20 py-24">
                    <ReportRenderer
                        engagement={sampleData.engagement}
                        client={sampleData.client}
                        provider={sampleData.provider}
                        template={template}
                        reportConfig={reportConfig}
                        highlightSections={mode === 'editing' ? highlightedSections : undefined}
                    />
                </div>
            </div>

            {/* Validation Errors Footer (hidden in selection mode) */}
            {mode !== 'selection' && validationErrors.length > 0 && (
                <PreviewFooter
                    mode={mode}
                    validationErrors={validationErrors}
                />
            )}
        </div>
    );
}

/**
 * Preview Header - Shows mode and template info
 */
function PreviewHeader({
    mode,
    template,
    validationErrors
}: {
    mode: PreviewMode;
    template: ReportTemplate;
    validationErrors: ValidationError[];
}) {
    const modeLabels = {
        selection: 'Template Preview',
        creation: 'Live Template Preview',
        editing: 'Report Configuration Preview'
    };

    const hasErrors = validationErrors.some(e => e.severity === 'error');
    const hasWarnings = validationErrors.some(e => e.severity === 'warning');

    return (
        <div className="preview-header bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">
                    {modeLabels[mode]}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    {template.name} • {template.sections.filter(s => s.isVisible).length} sections
                </p>
            </div>

            <div className="flex items-center gap-3">
                {hasErrors && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.filter(e => e.severity === 'error').length} Errors
                    </Badge>
                )}
                {hasWarnings && !hasErrors && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {validationErrors.filter(e => e.severity === 'warning').length} Warnings
                    </Badge>
                )}
                {!hasErrors && !hasWarnings && (
                    <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                    </Badge>
                )}
            </div>
        </div>
    );
}

/**
 * Preview Footer - Shows validation errors
 */
function PreviewFooter({
    mode,
    validationErrors
}: {
    mode: PreviewMode;
    validationErrors: ValidationError[];
}) {
    if (validationErrors.length === 0) return null;

    return (
        <div className="preview-footer bg-white border-t border-gray-200 px-6 py-4 space-y-3">
            {validationErrors.map((error, i) => (
                <div
                    key={i}
                    className={cn(
                        "flex items-start gap-3 rounded-lg border p-4 text-sm",
                        error.severity === 'error' && "border-red-200 bg-red-50 text-red-900",
                        error.severity === 'warning' && "border-yellow-200 bg-yellow-50 text-yellow-900",
                        error.severity === 'info' && "border-blue-200 bg-blue-50 text-blue-900"
                    )}
                >
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p>{error.message}</p>
                        {error.sectionId && (
                            <p className="mt-1 text-xs opacity-75">
                                Section: {error.sectionId}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Template Validation
 * 
 * Validates that a template is properly configured.
 * Returns errors that would prevent report generation.
 */
function validateTemplate(
    template: ReportTemplate,
    config?: ReportConfig
): ValidationError[] {
    const errors: ValidationError[] = [];

    const effectiveSections = config?.sections || template.sections;
    const visibleSections = effectiveSections.filter(s => s.isVisible);

    // Must have at least one visible section
    if (visibleSections.length === 0) {
        errors.push({
            severity: 'error',
            message: 'Template must have at least one visible section'
        });
    }

    // Cover page should be first (if visible)
    const coverSection = visibleSections.find(s => s.id === 'coverPage');
    if (coverSection && visibleSections[0].id !== 'coverPage') {
        errors.push({
            severity: 'warning',
            message: 'Cover page should typically be the first section',
            sectionId: 'coverPage'
        });
    }

    // Detailed findings requires findings summary (best practice)
    const hasDetailedFindings = visibleSections.some(s => s.id === 'detailedFindings');
    const hasSummaryTable = visibleSections.some(s => s.id === 'findingsSummaryTable');

    if (hasDetailedFindings && !hasSummaryTable) {
        errors.push({
            severity: 'warning',
            message: 'Consider adding Findings Summary section before Detailed Findings for better navigation',
            sectionId: 'findingsSummaryTable'
        });
    }

    // Recommendations should come after findings
    const recommendationsIndex = visibleSections.findIndex(s => s.id === 'recommendations');
    const detailedFindingsIndex = visibleSections.findIndex(s => s.id === 'detailedFindings');

    if (recommendationsIndex !== -1 && detailedFindingsIndex !== -1 && recommendationsIndex < detailedFindingsIndex) {
        errors.push({
            severity: 'warning',
            message: 'Recommendations section typically comes after Detailed Findings',
            sectionId: 'recommendations'
        });
    }

    // Custom sections should have content
    visibleSections.forEach(section => {
        if (section.type === 'custom' && !section.content && !config?.sectionOverrides?.[section.id]) {
            errors.push({
                severity: 'warning',
                message: `Custom section "${section.title}" has no content`,
                sectionId: section.id
            });
        }
    });

    // Info: Show section count
    if (visibleSections.length > 0) {
        errors.push({
            severity: 'info',
            message: `Template will generate ${visibleSections.length} section(s) in the final report`
        });
    }

    return errors;
}
