'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAllTemplates, deleteTemplate, createTemplate } from '@/lib/storage';
import { ReportTemplate } from '@/lib/types';
import { REPORT_TEMPLATES } from '@/lib/constants';
import { Plus, FileText, Trash2, Copy, Edit, ArrowLeft } from 'lucide-react';

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);

    useEffect(() => {
        setTemplates(getAllTemplates());
    }, []);

    const isSystemTemplate = (id: string) => {
        return !!REPORT_TEMPLATES[id];
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            if (deleteTemplate(id)) {
                setTemplates(getAllTemplates());
            } else {
                alert('Cannot delete system templates.');
            }
        }
    };

    const handleClone = (template: ReportTemplate) => {
        const { id, ...rest } = template;
        const result = createTemplate({
            ...rest,
            name: `${template.name} (Copy)`,
        });
        if ('id' in result) {
            setTemplates(getAllTemplates());
            router.push(`/templates/${result.id}`);
        } else {
            alert('Failed to clone template: ' + (result.errors?.join(', ') || 'Validation failed'));
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold">Report Templates</h1>
                            <p className="mt-2 text-muted-foreground">
                                Manage and customize your security report structures
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Create New Card */}
                    <Card className="flex flex-col items-center justify-center p-8 border-dashed shadow-none hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => router.push('/templates/new')}>
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <Plus className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">Create New Template</h3>
                        <p className="text-sm text-muted-foreground text-center mt-2">Start from scratch or base on an existing structure</p>
                    </Card>

                    {templates.map((template) => {
                        const isSystem = isSystemTemplate(typeof template.id === 'string' ? template.id : template.id);
                        return (
                            <Card key={template.id} className="p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <FileText className="h-6 w-6 text-blue-600" />
                                        </div>
                                        {isSystem && (
                                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">System</span>
                                        )}
                                        {!isSystem && (
                                            <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">Custom</span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                                    <p className="text-muted-foreground text-sm line-clamp-2">{template.description}</p>
                                </div>

                                <div className="mt-6 flex gap-2 justify-end">
                                    {isSystem ? (
                                        <Button variant="outline" size="sm" onClick={() => handleClone(template)}>
                                            <Copy className="mr-2 h-4 w-4" /> Clone
                                        </Button>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id as string)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                            <Link href={`/templates/${template.id}`}>
                                                <Button size="sm">
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
