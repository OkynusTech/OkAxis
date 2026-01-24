'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
    Code, Quote, Link as LinkIcon, Image as ImageIcon, Table, Eye, Edit2
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function MarkdownEditor({ value, onChange, placeholder = 'Content...', minHeight = '300px' }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [fileUploadLoading, setFileUploadLoading] = useState(false);

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const previousValue = textarea.value;
        const selectedText = previousValue.substring(start, end);

        const newText = previousValue.substring(0, start) + before + selectedText + after + previousValue.substring(end);

        onChange(newText);

        // Restore focus and selection
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        });
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Constraint validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("File size too large. Max 5MB.");
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert("Only images are supported.");
            return;
        }

        setFileUploadLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            insertText(`![${file.name}](${base64})`);
            setFileUploadLoading(false);
            e.target.value = ''; // Reset input
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col border border-input rounded-md overflow-hidden bg-background">
            <Tabs defaultValue="edit" className="w-full">
                <div className="flex items-center justify-between border-b px-2 py-2 bg-muted/40">
                    <TabsList className="grid w-[180px] grid-cols-2">
                        <TabsTrigger value="edit" className="flex items-center gap-2">
                            <Edit2 className="h-3 w-3" /> Edit
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-2">
                            <Eye className="h-3 w-3" /> Preview
                        </TabsTrigger>
                    </TabsList>

                    {/* Toolbar - Only visible in Edit mode, or handled via state ideally, but simpler to always show right side or hide when preview active? 
                        Let's keep it visible but disabled in preview if we want, or just hide. 
                        For simplicity in simple Tabs, we'll put the toolbar inside the Edit content or keep it top level. 
                        Top level allows quick switching but buttons might not work in preview. 
                        Let's put buttons in a toolbar div that is visible. */}
                </div>

                <TabsContent value="edit" className="p-0 m-0">
                    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-slate-700">
                        <ToolbarButton icon={<Bold className="h-4 w-4" />} onClick={() => insertText('**', '**')} tooltip="Bold" />
                        <ToolbarButton icon={<Italic className="h-4 w-4" />} onClick={() => insertText('*', '*')} tooltip="Italic" />
                        <div className="w-px h-4 bg-border mx-1" />
                        <ToolbarButton icon={<Heading1 className="h-4 w-4" />} onClick={() => insertText('# ')} tooltip="Heading 1" />
                        <ToolbarButton icon={<Heading2 className="h-4 w-4" />} onClick={() => insertText('## ')} tooltip="Heading 2" />
                        <ToolbarButton icon={<Heading3 className="h-4 w-4" />} onClick={() => insertText('### ')} tooltip="Heading 3" />
                        <div className="w-px h-4 bg-border mx-1" />
                        <ToolbarButton icon={<List className="h-4 w-4" />} onClick={() => insertText('- ')} tooltip="Bullet List" />
                        <ToolbarButton icon={<ListOrdered className="h-4 w-4" />} onClick={() => insertText('1. ')} tooltip="Numbered List" />
                        <div className="w-px h-4 bg-border mx-1" />
                        <ToolbarButton icon={<Quote className="h-4 w-4" />} onClick={() => insertText('> ')} tooltip="Quote" />
                        <ToolbarButton icon={<Code className="h-4 w-4" />} onClick={() => insertText('```\n', '\n```')} tooltip="Code Block" />
                        <div className="w-px h-4 bg-border mx-1" />
                        <ToolbarButton icon={<LinkIcon className="h-4 w-4" />} onClick={() => insertText('[', '](url)')} tooltip="Link" />

                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={handleFileUpload}
                                disabled={fileUploadLoading}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={fileUploadLoading}>
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        <ToolbarButton icon={<Table className="h-4 w-4" />} onClick={() => insertText('| Header | Header |\n| --- | --- |\n| Cell | Cell |')} tooltip="Table" />
                    </div>

                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="min-h-[300px] border-0 rounded-none focus-visible:ring-0 resize-y font-mono text-sm leading-relaxed p-4"
                        style={{ minHeight }}
                    />
                </TabsContent>

                <TabsContent value="preview" className="p-0 m-0 min-h-[300px] bg-white">
                    <MarkdownRenderer
                        content={value}
                        variant="preview"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700"
            title={tooltip}
        >
            {icon}
        </Button>
    );
}
