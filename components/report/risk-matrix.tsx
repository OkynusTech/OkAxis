import { Finding } from '@/lib/types';

interface RiskMatrixProps {
    findings: Finding[];
}

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

/**
 * Simple 2x2 risk matrix for executive summary
 * Maps findings into Impact × Likelihood quadrants
 * Print-safe, minimal styling
 */
export function RiskMatrix({ findings }: RiskMatrixProps) {
    // Map severity to impact/likelihood for visualization
    // This is a simplified heuristic for executive view
    const mapToQuadrant = (severity: RiskLevel): { impact: 'high' | 'low', likelihood: 'high' | 'low' } => {
        switch (severity) {
            case 'Critical':
                return { impact: 'high', likelihood: 'high' };
            case 'High':
                return { impact: 'high', likelihood: 'low' };
            case 'Medium':
                return { impact: 'low', likelihood: 'high' };
            case 'Low':
            case 'Informational':
            default:
                return { impact: 'low', likelihood: 'low' };
        }
    };

    const quadrants = {
        'high-high': findings.filter(f => {
            const q = mapToQuadrant(f.severity as RiskLevel);
            return q.impact === 'high' && q.likelihood === 'high';
        }).length,
        'high-low': findings.filter(f => {
            const q = mapToQuadrant(f.severity as RiskLevel);
            return q.impact === 'high' && q.likelihood === 'low';
        }).length,
        'low-high': findings.filter(f => {
            const q = mapToQuadrant(f.severity as RiskLevel);
            return q.impact === 'low' && q.likelihood === 'high';
        }).length,
        'low-low': findings.filter(f => {
            const q = mapToQuadrant(f.severity as RiskLevel);
            return q.impact === 'low' && q.likelihood === 'low';
        }).length,
    };

    return (
        <div>
            <p className="text-sm text-gray-600 mb-6">Risk positioning by impact and likelihood</p>
            <div className="grid grid-cols-2 gap-0 border-2 border-gray-300">
                {/* High Impact, High Likelihood - Top Left */}
                <div className="border-r border-b-2 border-gray-300 p-6 bg-red-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">High Impact × High Likelihood</div>
                    <div className="text-3xl font-medium text-red-700">{quadrants['high-high']}</div>
                    <div className="text-xs text-gray-600 mt-1">Immediate attention required</div>
                </div>

                {/* High Impact, Low Likelihood - Top Right */}
                <div className="border-b-2 border-gray-300 p-6 bg-orange-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">High Impact × Low Likelihood</div>
                    <div className="text-3xl font-medium text-orange-700">{quadrants['high-low']}</div>
                    <div className="text-xs text-gray-600 mt-1">Monitor and plan mitigation</div>
                </div>

                {/* Low Impact, High Likelihood - Bottom Left */}
                <div className="border-r border-gray-300 p-6 bg-yellow-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">Low Impact × High Likelihood</div>
                    <div className="text-3xl font-medium text-yellow-700">{quadrants['low-high']}</div>
                    <div className="text-xs text-gray-600 mt-1">Address systematically</div>
                </div>

                {/* Low Impact, Low Likelihood - Bottom Right */}
                <div className="p-6 bg-gray-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">Low Impact × Low Likelihood</div>
                    <div className="text-3xl font-medium text-gray-600">{quadrants['low-low']}</div>
                    <div className="text-xs text-gray-600 mt-1">Lower priority</div>
                </div>
            </div>

            {/* Axis labels */}
            <div className="mt-4 flex justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Impact:</span>
                    <span>Low → High</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-medium">Likelihood:</span>
                    <span>Low → High</span>
                </div>
            </div>
        </div>
    );
}
