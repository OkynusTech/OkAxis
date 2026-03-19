import { type ReactNode } from 'react';
import { SeverityLevel } from '@/lib/types';
import { SEVERITY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
    severity: SeverityLevel;
    className?: string;
    children?: ReactNode;
}

export function SeverityBadge({ severity, className, children }: SeverityBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold',
                SEVERITY_COLORS[severity],
                className
            )}
        >
            {children || severity}
        </span>
    );
}
