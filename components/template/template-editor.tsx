/**
 * Template Editor Component
 * 
 * Provides UI for editing template properties:
 * - Basic info (name, description)
 * - Section configuration (order, visibility)
 * - Branding settings
 * - Visual style
 * 
 * This is a FORM component - no preview logic.
 * Preview happens in TemplatePreviewer.
 */

'use client';

import { useState } from 'react';
import { ReportTemplate, ReportSection, BrandingConfig, VisualStyleConfig } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateEditorProps {
    template: ReportTemplate;
    onChange: (updated: ReportTemplate) => void;
}

export function TemplateEditor({ template, onChange }: TemplateEditorProps) {
    const [activeTab, setActiveTab] = useState<'basic' | 'sections' | 'branding' | 'style'>('basic');

    const handleBasicChange = (field: keyof ReportTemplate, value: any) => {
        onChange({ ...template, [field]: value });
    };

    const handleSectionsChange = (sections: ReportSection[]) => {
        onChange({ ...template, sections });
    };

    const handleBrandingChange = (branding: BrandingConfig) => {
        onChange({ ...template, branding });
    };

    return (
        <div className="template-editor space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {[
                    { id: 'basic', label: 'Basic Info' },
                    { id: 'sections', label: 'Sections' },
                    { id: 'branding', label: 'Branding' },
                    { id: 'style', label: 'Visual Style' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                            activeTab === tab.id
                                ? 'bg-white text-primary border-b-2 border-primary'
                                : 'text-gray-600 hover:text-gray-900'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'basic' && (
                <BasicInfoEditor template={template} onChange={handleBasicChange} />
            )}
            {activeTab === 'sections' && (
                <SectionEditor sections={template.sections} onChange={handleSectionsChange} />
            )}
            {activeTab === 'branding' && (
                <BrandingEditor branding={template.branding} onChange={handleBrandingChange} />
            )}
            {activeTab === 'style' && (
                <VisualStyleEditor template={template} onChange={handleBasicChange} />
            )}
        </div>
    );
}

/**
 * Basic Info Editor
 */
function BasicInfoEditor({
    template,
    onChange
}: {
    template: ReportTemplate;
    onChange: (field: keyof ReportTemplate, value: any) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Template Information</CardTitle>
                <CardDescription>Basic details about this template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                        id="name"
                        value={template.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="e.g., Enterprise Security Report"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={template.description}
                        onChange={(e) => onChange('description', e.target.value)}
                        placeholder="Brief description of when to use this template"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="technical">Technical Verbosity</Label>
                        <Select
                            id="technical"
                            value={template.technicalVerbosity}
                            onChange={(e) => onChange('technicalVerbosity', e.target.value)}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="business">Business Language</Label>
                        <Select
                            id="business"
                            value={template.businessLanguageLevel}
                            onChange={(e) => onChange('businessLanguageLevel', e.target.value)}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="strictness">Strictness</Label>
                        <Select
                            id="strictness"
                            value={template.strictnessLevel}
                            onChange={(e) => onChange('strictnessLevel', e.target.value as any)}
                        >
                            <option value="standard">Standard</option>
                            <option value="flexible">Flexible</option>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-6 pt-4">
                    <label className="flex items-center gap-2">
                        <Switch
                            checked={template.includeCVSS}
                            onCheckedChange={(checked) => onChange('includeCVSS', checked)}
                        />
                        <span className="text-sm font-medium">Include CVSS Scores</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <Switch
                            checked={template.includeCWE}
                            onCheckedChange={(checked) => onChange('includeCWE', checked)}
                        />
                        <span className="text-sm font-medium">Include CWE IDs</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <Switch
                            checked={template.includeOWASP}
                            onCheckedChange={(checked) => onChange('includeOWASP', checked)}
                        />
                        <span className="text-sm font-medium">Include OWASP Categories</span>
                    </label>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Section Editor - Reorder and toggle visibility
 */
function SectionEditor({
    sections,
    onChange
}: {
    sections: ReportSection[];
    onChange: (sections: ReportSection[]) => void;
}) {
    const toggleVisibility = (index: number) => {
        const updated = [...sections];
        updated[index] = { ...updated[index], isVisible: !updated[index].isVisible };
        onChange(updated);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sections.length - 1) return;

        const updated = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        onChange(updated);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Report Sections</CardTitle>
                <CardDescription>
                    Control which sections appear in reports and their order
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {sections.map((section, index) => (
                        <div
                            key={section.id}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border',
                                section.isVisible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                            )}
                        >
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />

                            <div className="flex-1">
                                <p className={cn(
                                    'text-sm font-medium',
                                    section.isVisible ? 'text-gray-900' : 'text-gray-400'
                                )}>
                                    {section.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {section.type === 'standard' ? 'Standard Section' : 'Custom Section'}
                                    {section.isLocked && ' • Locked'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-gray-900 border-gray-200"
                                    onClick={() => moveSection(index, 'up')}
                                    disabled={index === 0}
                                    title="Move Up"
                                >
                                    ↑
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-gray-900 border-gray-200"
                                    onClick={() => moveSection(index, 'down')}
                                    disabled={index === sections.length - 1}
                                    title="Move Down"
                                >
                                    ↓
                                </Button>
                                <Button
                                    variant={section.isVisible ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8",
                                        section.isVisible ? "bg-primary text-primary-foreground" : "text-gray-400"
                                    )}
                                    onClick={() => toggleVisibility(index)}
                                    // Removed disabled={section.isLocked} to allow unlocking everything based on request
                                    title={section.isVisible ? "Hide Section" : "Show Section"}
                                >
                                    {section.isVisible ? (
                                        <Eye className="h-4 w-4" />
                                    ) : (
                                        <EyeOff className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Branding Editor
 */
function BrandingEditor({
    branding,
    onChange
}: {
    branding?: BrandingConfig;
    onChange: (branding: BrandingConfig) => void;
}) {
    const config = branding || {};

    const handleChange = (field: keyof BrandingConfig, value: any) => {
        onChange({ ...config, [field]: value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Branding & Style</CardTitle>
                <CardDescription>Customize the visual appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                        <Switch
                            checked={config.useEnhancedCover}
                            onCheckedChange={(checked) => handleChange('useEnhancedCover', checked)}
                        />
                        <span className="text-sm font-medium">Enhanced Cover Page</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <Switch
                            checked={config.showChartsInExecutiveSummary}
                            onCheckedChange={(checked) => handleChange('showChartsInExecutiveSummary', checked)}
                        />
                        <span className="text-sm font-medium">Show Charts in Summary</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <Switch
                            checked={config.showRiskMatrix}
                            onCheckedChange={(checked) => handleChange('showRiskMatrix', checked)}
                        />
                        <span className="text-sm font-medium">Show Risk Matrix</span>
                    </label>
                </div>


                <div className="border-t border-gray-200 my-4 pt-4">
                    <h3 className="text-sm font-medium mb-3 text-gray-900">Logo Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="logoPlacement">Logo Placement</Label>
                            <Select
                                id="logoPlacement"
                                value={config.logoPlacement || 'cover'}
                                onChange={(e) => handleChange('logoPlacement', e.target.value)}
                            >
                                <option value="cover">Cover Page Only</option>
                                <option value="header">Header Only</option>
                                <option value="footer">Footer Only</option>
                                <option value="cover-and-header">Cover & Header</option>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientLogo">Client Logo URL</Label>
                            <Input
                                id="clientLogo"
                                value={config.clientLogoUrl || ''}
                                onChange={(e) => handleChange('clientLogoUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="providerLogo">Provider Logo URL</Label>
                            <Input
                                id="providerLogo"
                                value={config.providerLogoUrl || ''}
                                onChange={(e) => handleChange('providerLogoUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                        id="primaryColor"
                        value={config.primaryColor || ''}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        placeholder="default-primary"
                    />
                    <p className="text-xs text-gray-500">Use palette ID (e.g., 'royal-blue', 'deep-red')</p>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Visual Style Editor
 */
function VisualStyleEditor({
    template,
    onChange
}: {
    template: ReportTemplate;
    onChange: (field: keyof ReportTemplate, value: any) => void;
}) {
    const style = template.visualStyle || {} as VisualStyleConfig;

    const handleChange = (field: keyof VisualStyleConfig, value: any) => {
        onChange('visualStyle', { ...style, [field]: value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Visual Style</CardTitle>
                <CardDescription>Configure typography and spacing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fontFamily">Font Family</Label>
                        <Select
                            id="fontFamily"
                            value={style.fontFamily || 'system'}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                        >
                            <option value="system">System Default</option>
                            <option value="inter">Inter</option>
                            <option value="roboto">Roboto</option>
                            <option value="opensans">Open Sans</option>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="spacing">Spacing Density</Label>
                        <Select
                            id="spacing"
                            value={style.spacingDensity || 'comfortable'}
                            onChange={(e) => handleChange('spacingDensity', e.target.value)}
                        >
                            <option value="compact">Compact</option>
                            <option value="comfortable">Comfortable</option>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
