'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArtifactExcerptCardProps {
    excerpt: {
        artifactId: string;
        artifactName: string;
        artifactType: string;
        excerpt: string;
        relevanceScore: number;
        scopeLevel: 'client' | 'application' | 'engagement';
    };
    onExpand?: () => void;
    expanded?: boolean;
}

export function ArtifactExcerptCard({ excerpt, onExpand, expanded = false }: ArtifactExcerptCardProps) {
    const [isExpanded, setIsExpanded] = useState(expanded);

    // Get color for relevance score
    const getScoreColor = (score: number) => {
        if (score >= 0.7) return 'bg-green-500';
        if (score >= 0.5) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    // Get scope badge color
    const getScopeBadgeVariant = (level: string) => {
        if (level === 'engagement') return 'default';
        if (level === 'application') return 'secondary';
        return 'outline';
    };

    return (
        <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                {excerpt.artifactName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                    {excerpt.artifactType}
                                </Badge>
                                <Badge variant={getScopeBadgeVariant(excerpt.scopeLevel)} className="text-xs">
                                    {excerpt.scopeLevel}
                                </Badge>
                            </div>
                        </div>

                        {/* Relevance Score */}
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground">Relevance</div>
                                <div className="text-sm font-medium">
                                    {(excerpt.relevanceScore * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                    className={cn('h-2 rounded-full transition-all', getScoreColor(excerpt.relevanceScore))}
                                    style={{ width: `${excerpt.relevanceScore * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Excerpt */}
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {excerpt.excerpt}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsExpanded(!isExpanded);
                                if (onExpand && !isExpanded) {
                                    onExpand();
                                }
                            }}
                            className="text-xs h-7 px-2"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Collapse
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    View Full Artifact
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Navigate to artifact detail page
                                window.open(`/artifacts/${excerpt.artifactId}`, '_blank');
                            }}
                            className="text-xs h-7 px-2"
                        >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in New Tab
                        </Button>
                    </div>

                    {/* Expanded Content (Placeholder for full artifact) */}
                    {isExpanded && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <p className="text-xs text-muted-foreground mb-2">
                                Full artifact loading would be implemented here...
                            </p>
                            <p className="text-sm text-gray-700">
                                This would load the complete content of the artifact from the storage layer.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
