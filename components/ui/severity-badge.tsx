import { SeverityLevel } from '@/lib/types';
import { SEVERITY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
    severity: SeverityLevel;
    className?: string;
    children?: React.ReactNode;
}

export function SeverityBadge({ severity, className, children }: SeverityBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold',
                SEVERITY_COLORS[severity],
                className
            )}
        >
            {children || severity}
        </span>
    );
}
