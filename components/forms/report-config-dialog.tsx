
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Engagement, ReportConfiguration, TeamMember, ReportSection } from '@/lib/types';
import { getTemplate } from '@/lib/storage';
import { REPORT_TEMPLATES } from '@/lib/constants';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Layout, Type, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownEditor } from '@/components/ui/markdown-editor';

interface ReportConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    engagement: Engagement;
    onSave: (config: ReportConfiguration) => void;
}

export function ReportConfigDialog({
    open,
    onOpenChange,
    engagement,
    onSave,
}: ReportConfigDialogProps) {
    // Initial State
    const [config, setConfig] = useState<ReportConfiguration>(() => {
        const existingConfig = engagement.reportConfig;

        // Use getTemplate to handle both system and custom templates
        let template = getTemplate(engagement.templateId);

        // Fallback if template not found
        if (!template) {
            template = REPORT_TEMPLATES['enterprise'];
        }

        const defaultSections = JSON.parse(JSON.stringify(template.sections));

        return {
            sections: existingConfig?.sections || defaultSections,
            teamMembers: existingConfig?.teamMembers || [],
            contacts: existingConfig?.contacts || [],
            executiveSummaryOverride: existingConfig?.executiveSummaryOverride || '',
            conclusionOverride: existingConfig?.conclusionOverride || '',
            includeTeamSection: existingConfig?.includeTeamSection ?? false,
            includeContactSection: existingConfig?.includeContactSection ?? false,
            sectionOverrides: existingConfig?.sectionOverrides || {},
            visualStyleOverride: existingConfig?.visualStyleOverride,
            coverOverride: existingConfig?.coverOverride || {},
            brandingOverride: existingConfig?.brandingOverride, // Ensure this is preserved
        };
    });

    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

    const toggleSectionVisibility = (index: number, checked: boolean) => {
        const newSections = [...config.sections];
        newSections[index].isVisible = checked;
        setConfig({ ...config, sections: newSections });
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === config.sections.length - 1) return;

        const newSections = [...config.sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        const temp = newSections[index];
        newSections[index] = newSections[targetIndex];
        newSections[targetIndex] = temp;

        setConfig({ ...config, sections: newSections });
    };

    const addCustomSection = () => {
        const newSection: ReportSection = {
            id: `custom_${Date.now()}`,
            title: 'New Custom Section',
            type: 'custom',
            isVisible: true,
            content: '',
        };

        setConfig({ ...config, sections: [...config.sections, newSection] });
        setExpandedSectionId(newSection.id);
    };

    const updateSection = (index: number, field: keyof ReportSection, value: any) => {
        const newSections = [...config.sections];
        // @ts-ignore
        newSections[index] = { ...newSections[index], [field]: value };
        setConfig({ ...config, sections: newSections });
    };

    const updateSectionContent = (sectionId: string, content: string) => {
        // Check if it's a custom section (edit directly) or standard (use override)
        const sectionIndex = config.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        const section = config.sections[sectionIndex];

        if (section.type === 'custom') {
            updateSection(sectionIndex, 'content', content);
        } else {
            // Standard section override
            setConfig({
                ...config,
                sectionOverrides: {
                    ...(config.sectionOverrides || {}),
                    [sectionId]: content
                }
            });
        }
    };

    const removeSection = (index: number) => {
        const newSections = [...config.sections];
        newSections.splice(index, 1);
        setConfig({ ...config, sections: newSections });
    };

    // Team Helpers
    const handleAddTeamMember = () => {
        setConfig((prev) => ({
            ...prev,
            teamMembers: [...(prev.teamMembers || []), { name: '', role: '', email: '', qualifications: '' }],
        }));
    };

    const handleUpdateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
        const newMembers = [...(config.teamMembers || [])];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setConfig({ ...config, teamMembers: newMembers });
    };

    const handleRemoveTeamMember = (index: number) => {
        const newMembers = [...(config.teamMembers || [])];
        newMembers.splice(index, 1);
        setConfig({ ...config, teamMembers: newMembers });
    };

    const handleSave = () => {
        onSave(config);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Report Configuration</DialogTitle>
                    <DialogDescription>
                        Reorder sections, add custom content, and manage engagement details.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="structure" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="structure">Structure</TabsTrigger>
                        <TabsTrigger value="cover">Cover</TabsTrigger>
                        <TabsTrigger value="visuals">Visuals</TabsTrigger>
                        <TabsTrigger value="team">Team</TabsTrigger>
                        <TabsTrigger value="overrides">Overrides</TabsTrigger>
                    </TabsList>

                    <TabsContent value="structure" className="flex-1 overflow-y-auto pr-2 py-4 space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={addCustomSection} size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Add Custom Section
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {config.sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={cn(
                                        "rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md",
                                        section.type === 'custom' ? "border-blue-300 bg-blue-50/40" : "border-gray-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
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
                                                    disabled={index === config.sections.length - 1}
                                                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div>
                                                {section.type === 'custom' ? (
                                                    <Input
                                                        value={section.title}
                                                        onChange={(e) => updateSection(index, 'title', e.target.value)}
                                                        className="h-8 font-semibold"
                                                        placeholder="Section Title"
                                                    />
                                                ) : (
                                                    <span className="font-semibold block">{section.title}</span>
                                                )}
                                                <span className="text-xs text-gray-600">{section.type === 'custom' ? 'Custom Section' : 'Standard Component'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={section.isVisible}
                                                    onCheckedChange={(c) => toggleSectionVisibility(index, c)}
                                                    className="data-[state=checked]:bg-green-600"
                                                />
                                                <Label className={cn(
                                                    "text-xs w-12 font-medium",
                                                    section.isVisible ? "text-green-700 dark:text-green-400" : "text-slate-500 dark:text-slate-400"
                                                )}>{section.isVisible ? 'Visible' : 'Hidden'}</Label>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedSectionId(expandedSectionId === section.id ? null : section.id)}
                                            >
                                                {expandedSectionId === section.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                            {section.type === 'custom' && (
                                                <Button variant="ghost" size="icon" onClick={() => removeSection(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content Editor for ALL Sections */}
                                    {expandedSectionId === section.id && (
                                        <div className="p-4 border-t bg-white">
                                            <Label className="mb-2 block">
                                                {section.type === 'custom' ? 'Section Content' : 'Content Override'}
                                                {section.type !== 'custom' && (
                                                    <span className="ml-2 text-xs text-amber-600 font-normal">
                                                        (Adding content here will replace the automated generation for this section)
                                                    </span>
                                                )}
                                            </Label>
                                            <MarkdownEditor
                                                value={
                                                    section.type === 'custom'
                                                        ? (section.content || '')
                                                        : (config.sectionOverrides?.[section.id] || '')
                                                }
                                                onChange={(val) => updateSectionContent(section.id, val)}
                                                minHeight="300px"
                                                placeholder={section.type === 'custom' ? "Enter section content..." : "Enter override content..."}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="cover" className="flex-1 overflow-y-auto py-4 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Cover Page Configuration</h3>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>Title Override</Label>
                                    <Input
                                        value={config.coverOverride?.title || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, title: e.target.value }
                                        })}
                                        placeholder="Defaults to Assessment Type"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Subtitle</Label>
                                    <Input
                                        value={config.coverOverride?.subtitle || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, subtitle: e.target.value }
                                        })}
                                        placeholder="Defaults to Client Name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Date Text Override</Label>
                                    <Input
                                        value={config.coverOverride?.dateText || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, dateText: e.target.value }
                                        })}
                                        placeholder="Defaults to formatted date range"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Footer Text</Label>
                                    <Input
                                        value={config.coverOverride?.footerText || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, footerText: e.target.value }
                                        })}
                                        placeholder="Confidential - Internal Use Only"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-sm font-medium">Logos & Branding</h4>
                                <div className="flex items-center justify-between">
                                    <Label>Show Client Logo</Label>
                                    <Switch
                                        checked={config.coverOverride?.showClientLogo ?? true}
                                        onCheckedChange={(c) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, showClientLogo: c }
                                        })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Show Provider Logo</Label>
                                    <Switch
                                        checked={config.coverOverride?.showProviderLogo ?? true}
                                        onCheckedChange={(c) => setConfig({
                                            ...config,
                                            coverOverride: { ...config.coverOverride, showProviderLogo: c }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="visuals" className="flex-1 overflow-y-auto py-4 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Visual Style Overrides</h3>
                            <p className="text-sm text-gray-600">Experiment with styles for this report without changing the template.</p>

                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label>Font Family</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={config.visualStyleOverride?.fontFamily || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            visualStyleOverride: { ...config.visualStyleOverride, fontFamily: e.target.value as any }
                                        })}
                                    >
                                        <option value="">Use Template Default</option>
                                        <option value="inter">Inter (Modern)</option>
                                        <option value="roboto">Roboto (Technical)</option>
                                        <option value="opensans">Open Sans (Neutral)</option>
                                        <option value="system">System Default</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Spacing Density</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={config.visualStyleOverride?.spacingDensity || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            visualStyleOverride: { ...config.visualStyleOverride, spacingDensity: e.target.value as any }
                                        })}
                                    >
                                        <option value="">Use Template Default</option>
                                        <option value="comfortable">Comfortable (Standard)</option>
                                        <option value="compact">Compact (Dense)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Heading Scale</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={config.visualStyleOverride?.headingScale || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            visualStyleOverride: { ...config.visualStyleOverride, headingScale: e.target.value as any }
                                        })}
                                    >
                                        <option value="">Use Template Default</option>
                                        <option value="comfortable">Comfortable</option>
                                        <option value="compact">Compact</option>
                                        <option value="spacious">Spacious</option>
                                    </select>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label>Show Header & Footer</Label>
                                        <Switch
                                            checked={config.visualStyleOverride?.showHeaderFooter ?? true}
                                            onCheckedChange={(c) => setConfig({
                                                ...config,
                                                visualStyleOverride: { ...config.visualStyleOverride, showHeaderFooter: c }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Show Page Numbers</Label>
                                        <Switch
                                            checked={config.visualStyleOverride?.showPageNumbers ?? true}
                                            onCheckedChange={(c) => setConfig({
                                                ...config,
                                                visualStyleOverride: { ...config.visualStyleOverride, showPageNumbers: c }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="team" className="flex-1 overflow-y-auto py-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Team Members</h3>
                                <Button onClick={handleAddTeamMember} size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Member</Button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <Switch
                                    checked={config.includeTeamSection ?? false}
                                    onCheckedChange={(c) => setConfig({ ...config, includeTeamSection: c })}
                                />
                                <Label>Include Team Section in Report</Label>
                            </div>

                            {config.teamMembers?.map((member, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-end border p-4 rounded bg-muted/20 relative">
                                    <div className="col-span-3">
                                        <Label>Name</Label>
                                        <Input value={member.name} onChange={(e) => handleUpdateTeamMember(i, 'name', e.target.value)} />
                                    </div>
                                    <div className="col-span-3">
                                        <Label>Role</Label>
                                        <Input value={member.role} onChange={(e) => handleUpdateTeamMember(i, 'role', e.target.value)} />
                                    </div>
                                    <div className="col-span-5">
                                        <Label>Qualifications</Label>
                                        <Input value={member.qualifications} onChange={(e) => handleUpdateTeamMember(i, 'qualifications', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTeamMember(i)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="overrides" className="flex-1 overflow-y-auto py-4">
                        <div className="space-y-6">
                            <div>
                                <Label>Executive Summary Override</Label>
                                <p className="text-xs text-gray-600 mb-2">Leave empty to use generated summary.</p>
                                <Textarea
                                    value={config.executiveSummaryOverride || ''}
                                    onChange={(e) => setConfig({ ...config, executiveSummaryOverride: e.target.value })}
                                    rows={8}
                                />
                            </div>
                            <div>
                                <Label>Conclusion Override</Label>
                                <p className="text-xs text-gray-600 mb-2">Leave empty to use generated conclusion.</p>
                                <Textarea
                                    value={config.conclusionOverride || ''}
                                    onChange={(e) => setConfig({ ...config, conclusionOverride: e.target.value })}
                                    rows={6}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
