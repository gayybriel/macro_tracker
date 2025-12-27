"use client";

import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { TrendPoint } from '../types';
import { useState, useEffect } from 'react';

interface SparklineProps {
    data: TrendPoint[];
    color?: string;
    onHover?: (point: TrendPoint | null) => void;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    onHover?: (point: TrendPoint | null) => void;
}

// Side-effect component to bubble up hover state
const UpdateHover = ({ active, payload, onHover }: CustomTooltipProps) => {
    useEffect(() => {
        if (active && payload && payload.length > 0) {
            onHover?.(payload[0].payload);
        }
    }, [active, payload, onHover]);

    return null;
};

export default function Sparkline({ data, color = "#10b981", onHover }: SparklineProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!data || data.length === 0) {
        return <div className="h-full w-full bg-neutral-100/5 dark:bg-neutral-800/50 rounded flex items-center justify-center text-xs text-neutral-400">No Data</div>;
    }

    if (!mounted) {
        return <div className="h-full w-full bg-transparent" />; // Placeholder to prevent layout shift or hydration mismatch
    }

    const strokeColor = color;

    return (
        <div className="h-16 w-full cursor-crosshair">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    onMouseLeave={() => onHover?.(null)}
                >
                    <XAxis dataKey="date" hide />
                    {/* Hide axis but auto-scale */}
                    <YAxis domain={['auto', 'auto']} hide />

                    <Tooltip
                        content={(props: any) => <UpdateHover {...props} onHover={onHover} />}
                        cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-neutral-400' }}
                        isAnimationActive={false}
                    />

                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
