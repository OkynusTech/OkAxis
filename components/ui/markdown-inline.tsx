import React from 'react';

interface MarkdownInlineProps {
  content: string;
  className?: string;
}

export function MarkdownInline({ content, className = '' }: MarkdownInlineProps) {
  if (!content) return <span className={className}>{content}</span>;

  const parts = content.split(/(`[^`]+`)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={index}
              className="bg-muted px-1.5 py-0.5 rounded-md font-mono text-[0.9em] text-blue-600 dark:text-blue-400"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
