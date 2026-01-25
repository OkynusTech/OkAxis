'use client';

import { Component, Finding, SeverityLevel } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getComponentFindingsByComponent, deleteComponent } from '@/lib/storage';
import { Shield, Database, Globe, FileCode, Server, Layout, Cloud, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ComponentDetailDialogProps {
    component: Component | null;
    onClose: () => void;
    findings: Finding[];
    onDelete?: () => void;
}

export function ComponentDetailDialog({ component, onClose, findings, onDelete }: ComponentDetailDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!component) return null;

    const links = getComponentFindingsByComponent(component.id);
    const linkedFindings = findings.filter(f => component.findingIds.includes(f.id!));

    // Get severity color
    const getSeverityColor = (severity: SeverityLevel) => {
        switch (severity) {
            case 'Critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
            case 'High': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
            case 'Medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
            case 'Low': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const getTypeIcon = () => {
        switch (component.type) {
            case 'endpoint': return Globe;
            case 'service': return Server;
            case 'database': return Database;
            case 'file': return FileCode;
            case 'frontend': return Layout;
            case 'infrastructure': return Cloud;
            case 'external-api': return Globe;
            default: return Shield;
        }
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete component "${component.name}"? This action cannot be undone.`)) {
            setIsDeleting(true);
            deleteComponent(component.id);
            if (onDelete) onDelete();
            onClose();
            setIsDeleting(false);
        }
    };

    const TypeIcon = getTypeIcon();

    return (
        <Dialog open={!!component} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TypeIcon className="h-6 w-6 text-muted-foreground" />
                            <DialogTitle className="text-xl">{component.name}</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription>
                        Detailed view of the component and its security context.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Component Type</h3>
                            <Badge variant="outline" className="capitalize text-foreground">{component.type}</Badge>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Trust Zone</h3>
                            <Badge variant="secondary" className="capitalize text-foreground">{component.trustZone}</Badge>
                        </div>
                        {component.metadata?.technology && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Technology</h3>
                                <p className="text-sm text-foreground">{component.metadata.technology}</p>
                            </div>
                        )}
                        {component.metadata?.framework && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Framework</h3>
                                <p className="text-sm text-foreground">{component.metadata.framework}</p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {component.description && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                            <p className="text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-md border">
                                {component.description}
                            </p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Timeline</h3>
                        <div className="flex gap-6 text-sm text-foreground/80">
                            <div>
                                <span className="font-medium text-muted-foreground">First Seen:</span>{' '}
                                {new Date(component.firstSeen).toLocaleDateString()}
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Last Seen:</span>{' '}
                                {new Date(component.lastSeen).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Linked Findings */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Linked Findings ({linkedFindings.length})
                            </h3>
                        </div>

                        {linkedFindings.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No findings linked to this component yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {linkedFindings.map((finding) => {
                                    const link = links.find(l => l.findingId === finding.id);

                                    return (
                                        <div
                                            key={finding.id}
                                            className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-sm font-medium text-foreground flex-1">
                                                    {finding.title}
                                                </h4>
                                                <Badge className={cn('text-xs border', getSeverityColor(finding.severity))}>
                                                    {finding.severity}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Status: {finding.status}</span>
                                                {finding.discoveryDate && (
                                                    <span>
                                                        Discovered: {new Date(finding.discoveryDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {link && (
                                                    <span>
                                                        Confidence: {(link.confidence * 100).toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>

                                            {link && (
                                                <div className="mt-2 text-xs text-muted-foreground/80">
                                                    Extraction: {link.extractionMethod} • Role: {link.role}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="border-t pt-4 flex justify-between">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Component
                        </Button>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
