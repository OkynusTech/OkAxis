'use client';

/**
 * AI Wizard Panel — Agentic Template Generator
 *
 * An interactive chat UI where an AI "Template Architect" asks the user
 * clarifying questions about their report needs (audience, branding, sections).
 * When the AI has enough context, it autonomously generates a complete
 * ReportTemplate JSON payload and calls onApplyTemplate() to populate the Form Editor.
 *
 * Features:
 * - Multi-provider support (Groq / Gemini) via user preference
 * - Quick-start presets for common template archetypes
 * - Post-generation refinement — keep chatting after template is generated
 */

import { useState, useRef, useEffect, useTransition } from 'react';
import { chatTemplateWizardAction, generateCoverGraphicAction } from '@/app/actions/ai-actions';
import { getAIPreferences } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Bot, User, Send, Sparkles, Loader2, CheckCircle2, ArrowRight, RotateCcw, Zap, ImageIcon, X } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AiWizardPanelProps {
    onApplyTemplate: (templateData: object) => void;
    onCancel: () => void;
}

// ── Quick-Start Presets ──────────────────────────────────────────────────────

const QUICK_PRESETS = [
    {
        id: 'enterprise',
        label: 'Enterprise Formal',
        description: 'Comprehensive, all sections, compliance-ready',
        icon: '🏢',
        prompt: 'I want an Enterprise Formal template — comprehensive, all standard sections enabled, high technical and business language, CVSS + CWE + OWASP, enhanced cover with charts and risk matrix, Inter font, Navy & Sky color palette.',
    },
    {
        id: 'startup',
        label: 'Startup Lean',
        description: 'Fast, focused on findings & fixes',
        icon: '🚀',
        prompt: 'I want a Startup Lean template — concise and actionable. Only Cover Page, Executive Summary, Detailed Findings, and Recommendations. Medium technical, low business language. CVSS only. Compact spacing. Slate Pro palette.',
    },
    {
        id: 'compliance',
        label: 'Compliance & Audit',
        description: 'All sections with risk rating focus',
        icon: '📋',
        prompt: 'I want a Compliance & Audit template — all sections visible including Risk Rating Explanation, high technical + high business language, CVSS + CWE + OWASP, Georgia font for a formal look, Navy & Sky palette.',
    },
    {
        id: 'client-delivery',
        label: 'Client Deliverable',
        description: 'Polished report for external clients',
        icon: '📄',
        prompt: 'I want a Client Deliverable template — polished for external delivery. Include Cover Page, Confidentiality Notice, Executive Summary, Scope & Methodology, Findings Summary, Detailed Findings, Recommendations, and Conclusion. Medium technical, high business language. Enhanced cover with logos. Professional branding with your best palette suggestion.',
    },
    {
        id: 'redteam',
        label: 'Red Team / Offensive',
        description: 'Technical-heavy, dark theme',
        icon: '🔴',
        prompt: 'I want a Red Team / Offensive template — Cover Page, Executive Summary, Scope & Methodology, Detailed Findings, Recommendations. High technical, low business language. CVSS + CWE. Dark theme with Neon Dark palette and Roboto Mono font.',
    },
    {
        id: 'executive',
        label: 'Executive Summary Only',
        description: 'High-level overview for leadership',
        icon: '👔',
        prompt: 'I want an Executive Summary Only template — Cover Page, Executive Summary, Findings Summary table, and Conclusion. Low technical, high business language. Charts enabled. No CVSS/CWE/OWASP details. Clean minimal palette. Inter font.',
    },
];

const GREETING = `Hey! I'm your **Template Architect** — an AI assistant that will design the perfect report template for you.

Pick a **quick-start preset** below to get a head start, or just describe what you need and I'll ask a few questions to dial it in.`;

export function AiWizardPanel({ onApplyTemplate, onCancel }: AiWizardPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: GREETING }
    ]);
    const [input, setInput] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDone, setIsDone] = useState(false);
    const [generatedJson, setGeneratedJson] = useState<object | null>(null);
    const [hasApplied, setHasApplied] = useState(false);
    const [activeProvider, setActiveProvider] = useState<string>('');
    const [showPresets, setShowPresets] = useState(true);
    // Cover graphic generation
    const [showGraphicGen, setShowGraphicGen] = useState(false);
    const [graphicPrompt, setGraphicPrompt] = useState('');
    const [isGeneratingGraphic, setIsGeneratingGraphic] = useState(false);
    const [generatedGraphicUrl, setGeneratedGraphicUrl] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendToWizard = (userMessage: string) => {
        const trimmed = userMessage.trim();
        if (!trimmed || isPending) return;

        const updatedMessages: ChatMessage[] = [
            ...messages,
            { role: 'user', content: trimmed }
        ];
        setMessages(updatedMessages);
        setInput('');
        setShowPresets(false);

        // Filter out the greeting from messages sent to the AI
        const aiMessages = updatedMessages.filter(m => !(m.role === 'assistant' && m.content === GREETING));

        // Get provider preference
        const prefs = getAIPreferences();

        startTransition(async () => {
            const result = await chatTemplateWizardAction(aiMessages, prefs.provider);

            // Strip the JSON block from the visible chat message
            const visibleReply = result.reply.replace(/___TEMPLATE_JSON_START___[\s\S]*?___TEMPLATE_JSON_END___/, '').trim();

            setMessages(prev => [...prev, { role: 'assistant', content: visibleReply }]);
            setActiveProvider(result.provider);

            if (result.done && result.templateJson) {
                setIsDone(true);
                setGeneratedJson(result.templateJson);
                setHasApplied(false);
            }
        });
    };

    const handleSend = () => {
        sendToWizard(input);
    };

    const handlePresetClick = (preset: typeof QUICK_PRESETS[number]) => {
        sendToWizard(preset.prompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleGenerateGraphic = async () => {
        const trimmed = graphicPrompt.trim();
        if (!trimmed || isGeneratingGraphic) return;

        setIsGeneratingGraphic(true);
        try {
            const result = await generateCoverGraphicAction(trimmed);
            if (result.imageUrl) {
                setGeneratedGraphicUrl(result.imageUrl);
                // Show confirmation in chat
                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: `🎨 **Cover graphic generated!** It will be applied with your template. You can regenerate with a different prompt if you'd like.` }
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: `Couldn't generate graphic: ${result.error || 'Unknown error'}. You can try again or add one later in the Template Editor.` }
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Something went wrong generating the graphic. You can try again or add one later in the Template Editor.' }
            ]);
        } finally {
            setIsGeneratingGraphic(false);
            setShowGraphicGen(false);
            setGraphicPrompt('');
        }
    };

    const handleApply = () => {
        if (generatedJson) {
            // Inject generated cover graphic into the template if available
            let templateToApply = generatedJson;
            if (generatedGraphicUrl) {
                templateToApply = {
                    ...generatedJson,
                    branding: {
                        ...(generatedJson as Record<string, unknown>).branding as object,
                        coverGraphicUrl: generatedGraphicUrl,
                        coverGraphicPosition: ((generatedJson as Record<string, unknown>).branding as Record<string, unknown>)?.coverGraphicPosition || 'center',
                    },
                };
            }
            onApplyTemplate(templateToApply);
            setHasApplied(true);
        }
    };

    const handleKeepRefining = () => {
        setIsDone(false);
        setGeneratedJson(null);
        setHasApplied(false);
        // Add a system message indicating refinement mode
        setMessages(prev => [
            ...prev,
            { role: 'assistant', content: "Sure! Tell me what you'd like to change — colors, sections, fonts, layout, verbosity — anything. I'll generate an updated template." }
        ]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-card/80 backdrop-blur-sm shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold">AI Template Architect</h2>
                    <p className="text-xs text-muted-foreground">
                        {activeProvider
                            ? `Powered by ${activeProvider === 'gemini' ? 'Gemini 2.5 Flash' : 'Groq (Llama 3.3)'}`
                            : 'Agentic template designer — answer a few questions to get started'
                        }
                    </p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {messages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-3 max-w-4xl', msg.role === 'user' ? 'flex-row-reverse ml-auto' : 'flex-row')}>
                        {/* Avatar */}
                        <div className={cn(
                            'h-8 w-8 rounded-full shrink-0 flex items-center justify-center',
                            msg.role === 'assistant'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-secondary text-secondary-foreground'
                        )}>
                            {msg.role === 'assistant'
                                ? <Bot className="h-4 w-4" />
                                : <User className="h-4 w-4" />
                            }
                        </div>

                        {/* Bubble */}
                        <div className={cn(
                            'px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap',
                            msg.role === 'assistant'
                                ? 'bg-card border rounded-tl-sm'
                                : 'bg-primary text-primary-foreground rounded-tr-sm'
                        )}>
                            {/* Render basic markdown bold */}
                            {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                                part.startsWith('**') && part.endsWith('**')
                                    ? <strong key={j}>{part.slice(2, -2)}</strong>
                                    : <span key={j}>{part}</span>
                            )}
                        </div>
                    </div>
                ))}

                {/* Quick-Start Presets — shown after greeting */}
                {showPresets && messages.length === 1 && !isPending && (
                    <div className="max-w-4xl">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {QUICK_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetClick(preset)}
                                    className="group text-left p-4 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-lg">{preset.icon}</span>
                                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{preset.label}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug">{preset.description}</p>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-3">
                            Or type your own requirements below
                        </p>
                    </div>
                )}

                {/* AI thinking indicator */}
                {isPending && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-primary/10 text-primary">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}

                {/* Template ready CTA */}
                {isDone && (
                    <div className="flex flex-col items-center gap-3 py-6 px-4 mx-auto max-w-md">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="text-sm font-semibold text-center">
                            {hasApplied ? 'Template applied!' : 'Your template is ready!'}
                        </p>
                        <p className="text-xs text-muted-foreground text-center">
                            {hasApplied
                                ? 'Check the Form Editor to review and fine-tune, or keep refining here.'
                                : 'Click below to load it into the Form Editor, or keep refining.'
                            }
                        </p>

                        {/* Cover graphic generation option before applying */}
                        {!hasApplied && (
                            <div className="w-full mt-2">
                                {generatedGraphicUrl ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card mb-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={generatedGraphicUrl}
                                            alt="Cover graphic"
                                            className="h-16 w-16 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium">Cover graphic attached</p>
                                            <button
                                                className="text-[10px] text-primary hover:underline"
                                                onClick={() => { setGeneratedGraphicUrl(null); setShowGraphicGen(true); setIsDone(false); }}
                                            >
                                                Replace with different graphic
                                            </button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => setGeneratedGraphicUrl(null)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 mb-3"
                                        onClick={() => { setShowGraphicGen(true); setIsDone(false); }}
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                        Add AI Cover Graphic (optional)
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            {!hasApplied && (
                                <Button onClick={handleApply} className="gap-2" size="lg">
                                    <ArrowRight className="h-4 w-4" />
                                    Apply Template
                                </Button>
                            )}
                            <Button onClick={handleKeepRefining} variant="outline" className="gap-2" size="lg">
                                <RotateCcw className="h-4 w-4" />
                                Keep Refining
                            </Button>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input — always visible (even after generation for refinement) */}
            {!isDone && (
                <div className="border-t bg-card/50 backdrop-blur-sm shrink-0">
                    {/* Generated graphic preview */}
                    {generatedGraphicUrl && (
                        <div className="px-4 pt-3 max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={generatedGraphicUrl}
                                    alt="Generated cover graphic"
                                    className="h-12 w-12 rounded object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">Cover graphic ready</p>
                                    <p className="text-[10px] text-muted-foreground">Will be applied with your template</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => setGeneratedGraphicUrl(null)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Cover graphic generation inline panel */}
                    {showGraphicGen && (
                        <div className="px-4 pt-3 max-w-4xl mx-auto">
                            <div className="flex gap-2 items-center p-3 rounded-lg border bg-card">
                                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <Input
                                    value={graphicPrompt}
                                    onChange={e => setGraphicPrompt(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleGenerateGraphic(); }}
                                    placeholder="Describe the cover graphic (e.g., 'cybersecurity shield with circuit pattern')"
                                    className="flex-1 h-8 text-sm"
                                    disabled={isGeneratingGraphic}
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    onClick={handleGenerateGraphic}
                                    disabled={!graphicPrompt.trim() || isGeneratingGraphic}
                                    className="gap-1.5 shrink-0"
                                >
                                    {isGeneratingGraphic
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                                        : <><Sparkles className="h-3.5 w-3.5" /> Generate</>
                                    }
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => { setShowGraphicGen(false); setGraphicPrompt(''); }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="p-4">
                        {/* Quick action bar */}
                        <div className="flex items-center gap-2 max-w-4xl mx-auto mb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs h-7"
                                onClick={() => setShowGraphicGen(!showGraphicGen)}
                                disabled={isGeneratingGraphic}
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                {generatedGraphicUrl ? 'Regenerate Cover Graphic' : 'Generate Cover Graphic'}
                            </Button>
                        </div>

                        <div className="flex gap-2 items-end max-w-4xl mx-auto">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your ideal template, or pick a preset above... (Enter to send)"
                                rows={2}
                                className="resize-none flex-1 min-h-[60px] max-h-[200px]"
                                disabled={isPending}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isPending}
                                size="icon"
                                className="h-[60px] w-12 shrink-0"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        {activeProvider && (
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                <Zap className="h-3 w-3 text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground">
                                    Using {activeProvider === 'gemini' ? 'Gemini 2.5 Flash' : 'Groq (Llama 3.3 70B)'} — change in Settings
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
