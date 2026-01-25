'use client';

import * as React from 'react';
import { Wand2, RefreshCw, Minimize2, Maximize2, Check, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { refineTextAction, RefineAction, ContextMetadata } from '@/app/actions/ai-actions';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AIRefinementToolbarProps {
    selectedText: string;
    onReplace: (text: string) => void;
    onAppend: (text: string) => void;
    className?: string;
    context?: string;
    contextData?: ContextMetadata;
}

export function AIRefinementToolbar({ selectedText, onReplace, onAppend, className, context, contextData }: AIRefinementToolbarProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [refinedText, setRefinedText] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [sources, setSources] = React.useState<string[]>([]);
    const [lastAction, setLastAction] = React.useState<RefineAction | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleAction = async (action: RefineAction) => {
        if (!selectedText) return;

        setIsLoading(true);
        setError(null);
        setRefinedText(null);
        setSources([]);
        setLastAction(action);

        try {
            const result = await refineTextAction(selectedText, action, context, contextData);

            // Handle legacy string return or new object return
            let outputText = '';
            let usedSources: string[] = [];

            if (typeof result === 'string') {
                outputText = result;
            } else {
                outputText = result.output;
                usedSources = result.contextUsed;
            }

            if (outputText.startsWith('[Error]')) {
                setError(outputText.replace('[Error]', '').trim());
            } else {
                setRefinedText(outputText);
                setSources(usedSources);
            }
        } catch (error) {
            console.error('Refinement failed:', error);
            setError('Failed to connect to AI service. Please check configuration.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = (mode: 'replace' | 'append') => {
        if (!refinedText) return;

        if (mode === 'replace') {
            onReplace(refinedText);
        } else {
            onAppend(refinedText);
        }

        setIsOpen(false);
        setRefinedText(null);
    };

    const hasSelection = selectedText && selectedText.trim().length > 0;

    return (
        <div className="relative inline-block" ref={containerRef}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("h-8 gap-1.5 font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50", className, isOpen && "bg-purple-100 text-purple-800")}
                disabled={!hasSelection}
            >
                <Wand2 className="h-3.5 w-3.5" />
                AI Refine
            </Button>

            {isOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-[400px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 slide-in-from-top-2">
                    {!refinedText ? (
                        <div className="p-2">
                            <div className="grid grid-cols-2 gap-1">
                                <ActionButton
                                    icon={Wand2}
                                    label="Refine"
                                    onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); handleAction('refine'); }}
                                    disabled={isLoading}
                                />
                                <ActionButton
                                    icon={RefreshCw}
                                    label="Rewrite"
                                    onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); handleAction('rewrite'); }}
                                    disabled={isLoading}
                                />
                                <ActionButton
                                    icon={Minimize2}
                                    label="Shorten"
                                    onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); handleAction('shorten'); }}
                                    disabled={isLoading}
                                />
                                <ActionButton
                                    icon={Maximize2}
                                    label="Expand"
                                    onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); handleAction('expand'); }}
                                    disabled={isLoading}
                                />
                            </div>
                            {isLoading && (
                                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Refining text...
                                </div>
                            )}
                            {error && (
                                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md mt-2">
                                    <p className="font-semibold mb-1">Error</p>
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="p-3 bg-muted/30 border-b max-h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {lastAction}d Result
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">AI Generated</span>
                                    </div>
                                </div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background p-2 rounded border border-border/50">
                                    {refinedText}
                                </div>
                                <div className="mt-2 text-[10px] text-muted-foreground bg-blue-50/50 p-1.5 rounded border border-blue-100/50">
                                    <div className="font-semibold mb-0.5 text-blue-800">Sources Referenced:</div>
                                    {sources.length > 0 ? (
                                        <ul className="list-disc pl-3 space-y-0.5">
                                            {sources.map((src, i) => (
                                                <li key={i}>{src}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-gray-500 italic pl-1">None (General Knowledge)</div>
                                    )}
                                </div>
                            </div>
                            <div className="p-2 flex items-center justify-between gap-2 bg-background">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRefinedText(null)}
                                >
                                    <ArrowRight className="h-3.5 w-3.5 mr-1 rotate-180" />
                                    Try Again
                                </Button>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAccept('append')}
                                        className="h-8 text-xs"
                                    >
                                        <CornerDownLeft className="h-3.5 w-3.5 mr-1" />
                                        Append
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleAccept('replace')}
                                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1" />
                                        Replace
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, disabled }: any) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start h-9 px-2.5 font-normal text-muted-foreground hover:text-foreground"
            onClick={onClick}
            disabled={disabled}
        >
            <Icon className="h-4 w-4 mr-2 opacity-70" />
            {label}
        </Button>
    );
}
