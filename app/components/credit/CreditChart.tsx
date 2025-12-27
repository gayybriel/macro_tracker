"use client";

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CreditDataPoint } from '../../types/credit';
import { format, parseISO, subMonths, subYears } from 'date-fns';

interface Props {
    data: CreditDataPoint[];
}

export default function CreditChart({ data }: Props) {
    const [range, setRange] = useState<'6M' | '1Y' | '2Y' | '5Y'>('2Y');
    const [showComponents, setShowComponents] = useState(false);

    const filteredData = useMemo(() => {
        if (!data.length) return [];
        const lastDate = parseISO(data[data.length - 1].obs_date);
        let startDate = subYears(lastDate, 2); // default

        if (range === '6M') startDate = subMonths(lastDate, 6);
        if (range === '1Y') startDate = subYears(lastDate, 1);
        if (range === '5Y') startDate = subYears(lastDate, 5);

        return data.filter(d => parseISO(d.obs_date) >= startDate);
    }, [data, range]);

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                    {(['6M', '1Y', '2Y', '5Y'] as const).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${range === r
                                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Show Components</span>
                    <button
                        onClick={() => setShowComponents(!showComponents)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${showComponents ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                    >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${showComponents ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.2} />
                        <XAxis
                            dataKey="obs_date"
                            tickFormatter={(str) => format(parseISO(str), 'MMM yy')}
                            stroke="#888888"
                            fontSize={10}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            yAxisId="bps"
                            orientation="left"
                            stroke="#888888"
                            fontSize={10}
                            tickLine={false}
                            width={35}
                            domain={['auto', 'auto']}
                        />
                        {showComponents && (
                            <YAxis
                                yAxisId="pct"
                                orientation="right"
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                width={30}
                                unit="%"
                                domain={['auto', 'auto']}
                            />
                        )}
                        <Tooltip
                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                            labelFormatter={(str) => format(parseISO(str), 'MMM dd, yyyy')}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />

                        <Line
                            yAxisId="bps"
                            type="monotone"
                            dataKey="gap_bps"
                            name="Credit Gap (bps)"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                        />

                        {showComponents && (
                            <>
                                <Line
                                    yAxisId="pct"
                                    type="monotone"
                                    dataKey="hy_oas_pct"
                                    name="HY OAS (%)"
                                    stroke="#ec4899"
                                    strokeWidth={1.5}
                                    dot={false}
                                    strokeDasharray="4 4"
                                />
                                <Line
                                    yAxisId="pct"
                                    type="monotone"
                                    dataKey="ig_oas_pct"
                                    name="IG OAS (%)"
                                    stroke="#3b82f6"
                                    strokeWidth={1.5}
                                    dot={false}
                                    strokeDasharray="4 4"
                                />
                            </>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
