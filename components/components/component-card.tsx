'use client';

import { Component, ComponentType, TrustZone, SeverityLevel } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Database, Globe, FileCode, Server, Layout, Cloud, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComponentCardProps {
    component: Component;
    findingCount: number;
    highestSeverity?: SeverityLevel;
    onClick: () => void;
}

export function ComponentCard({ component, findingCount, highestSeverity, onClick }: ComponentCardProps) {
    // Get icon for component type
    const getTypeIcon = (type: ComponentType) => {
        switch (type) {
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

    // Get color for trust zone
    const getTrustZoneColor = (zone: TrustZone) => {
        switch (zone) {
            case 'public': return 'bg-red-100 text-red-800 border-red-300';
            case 'authenticated': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'internal': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'admin': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'database': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-600 border-gray-300';
        }
    };

    // Get severity indicator color
    const getSeverityColor = (severity?: SeverityLevel) => {
        if (!severity || findingCount === 0) return 'text-green-500';
        switch (severity) {
            case 'Critical': return 'text-red-600';
            case 'High': return 'text-orange-600';
            case 'Medium': return 'text-yellow-600';
            case 'Low': return 'text-blue-600';
            default: return 'text-gray-500';
        }
    };

    const TypeIcon = getTypeIcon(component.type);

    return (
        <Card
            className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
            onClick={onClick}
        >
            <div className="flex items-start gap-3">
                <div className="mt-1">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Component Name */}
                    <h3 className="text-sm font-semibold text-foreground truncate mb-2">
                        {component.name}
                    </h3>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs capitalize text-foreground">
                            {component.type}
                        </Badge>
                        <Badge className={cn('text-xs capitalize border text-foreground', getTrustZoneColor(component.trustZone))}>
                            {component.trustZone}
                        </Badge>
                        {component.metadata?.technology && (
                            <Badge variant="secondary" className="text-xs text-foreground">
                                {component.metadata.technology}
                            </Badge>
                        )}
                    </div>

                    {/* Finding Count & Severity */}
                    <div className="flex items-center gap-2">
                        <AlertCircle className={cn('h-4 w-4', getSeverityColor(highestSeverity))} />
                        <span className="text-xs text-muted-foreground">
                            {findingCount === 0 ? (
                                'No findings'
                            ) : (
                                <>
                                    <span className="font-semibold">{findingCount}</span>{' '}
                                    {findingCount === 1 ? 'finding' : 'findings'}
                                    {highestSeverity && (
                                        <span className={cn('ml-1 font-medium', getSeverityColor(highestSeverity))}>
                                            ({highestSeverity})
                                        </span>
                                    )}
                                </>
                            )}
                        </span>
                    </div>

                    {/* Dates */}
                    <div className="mt-2 text-xs text-muted-foreground">
                        <div>First seen: {new Date(component.firstSeen).toLocaleDateString()}</div>
                        <div>Last seen: {new Date(component.lastSeen).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
