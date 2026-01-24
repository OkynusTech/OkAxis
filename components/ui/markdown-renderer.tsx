'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    variant?: 'preview' | 'report';
    onImageError?: (src: string) => void;
    className?: string;
}

/**
 * Unified Markdown Renderer Component
 * 
 * This component provides a single source of truth for markdown rendering
 * across both the preview (MarkdownEditor) and final report generation.
 * 
 * Key Features:
 * - Uses ReactMarkdown with remarkGfm for consistent rendering
 * - Preserves data URIs and external URLs via urlTransform passthrough
 * - Custom image component with error handling
 * - Variant-based styling for preview vs report contexts
 */
export function MarkdownRenderer({
    content,
    variant = 'preview',
    onImageError,
    className
}: MarkdownRendererProps) {
    const handleImageError = (src: string) => {
        console.warn(`Failed to load image: ${src}`);
        if (onImageError) {
            onImageError(src);
        }
    };

    // Variant-specific styling
    const variantClasses = {
        preview: 'prose prose-sm max-w-none p-6 text-gray-800 leading-loose',
        report: 'prose prose-sm max-w-none text-gray-700 leading-loose'
    };

    const containerClass = className || variantClasses[variant];

    return (
        <div className={containerClass}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                // Preserve all URLs including data URIs - critical for base64 images
                urlTransform={(value: string) => value}
                components={{
                    img: ({ node, ...props }) => {
                        if (!props.src) return null;

                        return (
                            <img
                                {...props}
                                className="max-w-full rounded-md border shadow-sm my-4"
                                onError={() => handleImageError(props.src || '')}
                                // Ensure data URIs are preserved in print
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    display: 'block'
                                }}
                            />
                        );
                    }
                }}
            >
                {content || (variant === 'preview' ? '*No content*' : '')}
            </ReactMarkdown>
        </div>
    );
}
