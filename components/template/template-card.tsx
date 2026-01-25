/**
 * Template Selection Card
 * 
 * Compact template card for selection grids.
 * Shows template name, description, and preview button.
 */

'use client';

import { ReportTemplate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateCardProps {
    template: ReportTemplate;
    isSelected: boolean;
    onClick: () => void;
    onPreview: () => void;
}

export function TemplateCard({
    template,
    isSelected,
    onClick,
    onPreview
}: TemplateCardProps) {
    return (
        <Card
            className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                isSelected && 'ring-2 ring-primary border-primary shadow-md'
            )}
            onClick={onClick}
        >
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            {template.name}
                            {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                            {template.description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                        {template.sections.filter(s => s.isVisible).length} sections
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {template.technicalVerbosity} Technical
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {template.businessLanguageLevel} Business
                    </Badge>
                    {template.includeCVSS && (
                        <Badge variant="outline" className="text-xs">
                            CVSS
                        </Badge>
                    )}
                </div>
            </CardContent>

            <CardFooter>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                    }}
                >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Template
                </Button>
            </CardFooter>
        </Card>
    );
}
