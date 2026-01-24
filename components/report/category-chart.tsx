import { Finding } from '@/lib/types';

interface CategoryChartProps {
    findings: Finding[];
}

/**
 * Print-safe category breakdown chart
 * Shows findings grouped by category to identify systemic issues
 * Executive-grade, document-style
 */
export function CategoryChart({ findings }: CategoryChartProps) {
    // Group findings by category
    const categoryMap = new Map<string, number>();

    findings.forEach(finding => {
        const category = finding.category || finding.threatCategory || finding.concernCategory || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Convert to array and sort by count descending
    const categories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 categories

    if (categories.length === 0) {
        return null;
    }

    const maxCount = Math.max(...categories.map(c => c.count), 1);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-6">Top vulnerability categories identified</p>
            {categories.map(({ category, count }) => {
                const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                    <div key={category} className="flex items-center gap-4">
                        <div className="w-48 text-sm font-medium text-gray-800 truncate" title={category}>
                            {category}
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 h-7 bg-gray-100 relative">
                                <div
                                    className="h-full bg-gray-700 transition-all"
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
