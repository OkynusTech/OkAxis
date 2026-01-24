import React from 'react';
import { Card } from '@/components/ui/card';

interface RiskScoreGaugeProps {
    score: number; // 0-100
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function RiskScoreGauge({ score, label, size = 'md' }: RiskScoreGaugeProps) {
    // Clamp score to 0-100
    const clampedScore = Math.max(0, Math.min(100, score));

    // Calculate rotation for gauge needle
    const rotation = (clampedScore / 100) * 180 - 90;

    // Determine color based on score
    const getColor = () => {
        if (clampedScore >= 75) return { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' };
        if (clampedScore >= 50) return { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' };
        if (clampedScore >= 25) return { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' };
        return { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' };
    };

    const getRiskLevel = () => {
        if (clampedScore >= 75) return 'Critical';
        if (clampedScore >= 50) return 'High';
        if (clampedScore >= 25) return 'Medium';
        return 'Low';
    };

    const colors = getColor();

    // Size mappings
    const sizeMap = {
        sm: { width: 120, textSize: 'text-2xl', labelSize: 'text-xs' },
        md: { width: 160, textSize: 'text-3xl', labelSize: 'text-sm' },
        lg: { width: 200, textSize: 'text-4xl', labelSize: 'text-base' },
    };

    const dimensions = sizeMap[size];

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: dimensions.width, height: dimensions.width / 2 + 40 }}>
                {/* Semi-circle background */}
                <svg
                    width={dimensions.width}
                    height={dimensions.width / 2}
                    className="absolute top-0 left-0"
                >
                    {/* Background arc */}
                    <path
                        d={`M 10 ${dimensions.width / 2} A ${dimensions.width / 2 - 10} ${dimensions.width / 2 - 10} 0 0 1 ${dimensions.width - 10} ${dimensions.width / 2}`}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />

                    {/* Color segments */}
                    <path
                        d={`M 10 ${dimensions.width / 2} A ${dimensions.width / 2 - 10} ${dimensions.width / 2 - 10} 0 0 1 ${dimensions.width / 4 + 5} ${dimensions.width / 4}`}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${dimensions.width / 4 + 5} ${dimensions.width / 4} A ${dimensions.width / 2 - 10} ${dimensions.width / 2 - 10} 0 0 1 ${dimensions.width / 2} 10`}
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${dimensions.width / 2} 10 A ${dimensions.width / 2 - 10} ${dimensions.width / 2 - 10} 0 0 1 ${3 * dimensions.width / 4 - 5} ${dimensions.width / 4}`}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${3 * dimensions.width / 4 - 5} ${dimensions.width / 4} A ${dimensions.width / 2 - 10} ${dimensions.width / 2 - 10} 0 0 1 ${dimensions.width - 10} ${dimensions.width / 2}`}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />

                    {/* Needle */}
                    <g transform={`rotate(${rotation} ${dimensions.width / 2} ${dimensions.width / 2})`}>
                        <line
                            x1={dimensions.width / 2}
                            y1={dimensions.width / 2}
                            x2={dimensions.width / 2}
                            y2="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className={colors.text}
                        />
                        <circle
                            cx={dimensions.width / 2}
                            cy={dimensions.width / 2}
                            r="6"
                            fill="currentColor"
                            className={colors.text}
                        />
                    </g>
                </svg>

                {/* Score Display */}
                <div className="absolute bottom-0 left-0 right-0 text-center">
                    <div className={`font-bold ${dimensions.textSize} ${colors.text}`}>
                        {clampedScore}
                    </div>
                    <div className={`${dimensions.labelSize} text-muted-foreground font-medium`}>
                        {getRiskLevel()} Risk
                    </div>
                </div>
            </div>

            {label && (
                <div className="mt-2 text-sm font-medium text-foreground">
                    {label}
                </div>
            )}
        </div>
    );
}
