import { Finding } from '@/lib/types';

interface SeverityChartProps {
    findings: Finding[];
}

/**
 * Print-safe severity distribution chart
 * Horizontal bar chart showing count per severity level
 * Executive-grade, minimal styling
 */
export function SeverityChart({ findings }: SeverityChartProps) {
    const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Informational'];

    const counts = severityOrder.map(severity => ({
        severity,
        count: findings.filter(f => f.severity === severity).length
    }));

    const maxCount = Math.max(...counts.map(c => c.count), 1);

    const severityColors = {
        'Critical': 'bg-red-600',
        'High': 'bg-orange-600',
        'Medium': 'bg-yellow-500',
        'Low': 'bg-blue-500',
        'Informational': 'bg-gray-500'
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-6">Distribution of findings by severity level</p>
            {counts.map(({ severity, count }) => {
                const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                    <div key={severity} className="flex items-center gap-4">
                        <div className="w-28 text-sm font-medium text-gray-800">{severity}</div>
                        <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 h-8 bg-gray-100 relative">
                                <div
                                    className={`h-full ${severityColors[severity as keyof typeof severityColors]} transition-all`}
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>
                            <div className="w-12 text-right text-sm font-medium text-gray-900">{count}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
