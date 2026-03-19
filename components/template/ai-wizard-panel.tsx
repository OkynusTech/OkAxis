'use client';

/**
 * AI Wizard Panel — Agentic Template Generator
 *
 * An interactive chat UI where an AI "Template Architect" asks the user
 * clarifying questions about their report needs (audience, branding, sections).
 * When the AI has enough context, it autonomously generates a complete
 * ReportTemplate JSON payload and calls onApplyTemplate() to populate the Form Editor.
 */

import { useState, useRef, useEffect, useTransition } from 'react';
import { chatTemplateWizardAction } from '@/app/actions/ai-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Bot, User, Send, Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AiWizardPanelProps {
    onApplyTemplate: (templateData: object) => void;
    onCancel: () => void;
}

const GREETING = `👋 Hi! I'm your **Template Architect** — an AI assistant that will design the perfect report template for you.

I'll ask you a few quick questions to understand your needs, then generate a complete, customized template with sections, branding colors, typography, and everything configured.

To get started: **What kind of report is this template for?** (e.g., Web Application Pentest, Network Audit, Cloud Security Review, Compliance Assessment...)`;

export function AiWizardPanel({ onApplyTemplate, onCancel }: AiWizardPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: GREETING }
    ]);
    const [input, setInput] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDone, setIsDone] = useState(false);
    const [generatedJson, setGeneratedJson] = useState<object | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isPending) return;

        const updatedMessages: ChatMessage[] = [
            ...messages,
            { role: 'user', content: trimmed }
        ];
        setMessages(updatedMessages);
        setInput('');

        // Only send the real chat messages (no greeting) to the AI
        const aiMessages = updatedMessages.filter(m => !(m.role === 'assistant' && m.content === GREETING));

        startTransition(async () => {
            const result = await chatTemplateWizardAction(aiMessages);

            // Strip the JSON block from the visible chat message
            const visibleReply = result.reply.replace(/___TEMPLATE_JSON_START___[\s\S]*?___TEMPLATE_JSON_END___/, '').trim();

            setMessages(prev => [...prev, { role: 'assistant', content: visibleReply }]);

            if (result.done && result.templateJson) {
                setIsDone(true);
                setGeneratedJson(result.templateJson);
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApply = () => {
        if (generatedJson) {
            onApplyTemplate(generatedJson);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-card/80 backdrop-blur-sm shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold">AI Template Architect</h2>
                    <p className="text-xs text-muted-foreground">Agentic template designer — answer a few questions to get started</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onCancel}>
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
                        <p className="text-sm font-semibold text-center">Your template is ready!</p>
                        <p className="text-xs text-muted-foreground text-center">
                            Click below to load it into the Form Editor where you can make final adjustments before saving.
                        </p>
                        <Button onClick={handleApply} className="gap-2 mt-2" size="lg">
                            <ArrowRight className="h-4 w-4" />
                            Apply Template to Editor
                        </Button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!isDone && (
                <div className="p-4 border-t bg-card/50 backdrop-blur-sm shrink-0">
                    <div className="flex gap-2 items-end max-w-4xl mx-auto">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
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
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        The AI will ask 4–6 questions, then generate your complete template
                    </p>
                </div>
            )}
        </div>
    );
}
