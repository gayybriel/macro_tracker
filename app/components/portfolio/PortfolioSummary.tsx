"use client";

import { PortfolioGroup } from '../../types/portfolio';

interface Props {
    totalSgd: number;
    groups: PortfolioGroup[];
}

export default function PortfolioSummary({ totalSgd, groups }: Props) {
    // Basic Allocations
    const cashGroup = groups.find(g => g.id === 'cash');
    const cashVal = cashGroup?.totalSgd || 0;
    const cashPct = totalSgd > 0 ? (cashVal / totalSgd) * 100 : 0;

    // Largest Group (for highlight)
    const largestGroup = [...groups].sort((a, b) => b.totalSgd - a.totalSgd)[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Total Value Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-center">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Portfolio Value</span>
                <div className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(totalSgd)}
                </div>
                <div className="text-xs text-neutral-500 mt-2 flex gap-4">
                    <span>SGD Base Currency</span>
                </div>
            </div>

            {/* Allocation Stats */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-center">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Allocation Summary</span>
                <div className="space-y-3">
                    {/* Cash vs Risk */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-neutral-600 dark:text-neutral-300">Cash / Liquidity</span>
                            <span className="font-mono text-neutral-500">{cashPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cashPct}%` }}></div>
                        </div>
                    </div>

                    {/* Top Allocation */}
                    {largestGroup && largestGroup.id !== 'cash' && (
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-neutral-600 dark:text-neutral-300">Top Allocation ({largestGroup.label})</span>
                                <span className="font-mono text-neutral-500">{largestGroup.weightPct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${largestGroup.weightPct}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
