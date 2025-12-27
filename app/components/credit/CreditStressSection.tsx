"use client";

import { useState, useEffect } from 'react';
import { CreditDataPoint, CreditStats } from '../../types/credit';
import CreditChart from './CreditChart';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function CreditStressSection() {
    const [stats, setStats] = useState<CreditStats | null>(null);
    const [history, setHistory] = useState<CreditDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchCredit = async () => {
            try {
                const res = await fetch('/api/credit-stress');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setHistory(data.history);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCredit();
    }, []);

    if (loading) {
        return <div className="h-40 bg-white dark:bg-neutral-900 rounded-xl animate-pulse" />;
    }

    if (!stats) return null;

    // Interpretation Heuristics
    let stressLabel = "Calm";
    let stressColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20";
    if (stats.gap_bps > 350) {
        stressLabel = "Elevated";
        stressColor = "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
    }
    if (stats.gap_bps > 500) {
        stressLabel = "High Stress";
        stressColor = "text-red-500 bg-red-50 dark:bg-red-900/20";
    }

    return (
        <section className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-neutral-400" />
                Credit Stress Monitor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gap Card - Clickable */}
                <div
                    onClick={() => setExpanded(!expanded)}
                    className={`bg-white dark:bg-neutral-900 border transition-all cursor-pointer relative overflow-hidden group rounded-xl p-4
                        ${expanded ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                >
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Credit Risk Gap</span>
                        <span className="text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                            {expanded ? 'Hide Details' : 'View Details'}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                            {stats.gap_bps.toFixed(0)} <span className="text-sm font-normal text-neutral-500">bps</span>
                        </span>

                        {/* 30D Change */}
                        <div className={`flex items-center text-xs font-medium ${stats.change_30d_bps > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {stats.change_30d_bps > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                            {Math.abs(stats.change_30d_bps).toFixed(0)} bps (30d)
                        </div>
                    </div>
                    <div className={`mt-3 inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase ${stressColor}`}>
                        {stressLabel}
                    </div>
                </div>

                {/* HY OAS */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">High Yield OAS</span>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                        {stats.hy_oas_pct.toFixed(2)}%
                    </div>
                    <div className="mt-4 text-xs text-neutral-500">
                        Junk Bond Spreads
                    </div>
                </div>

                {/* IG OAS */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Investment Grade OAS</span>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                        {stats.ig_oas_pct.toFixed(2)}%
                    </div>
                    <div className="mt-4 text-xs text-neutral-500">
                        High Grade Spreads
                    </div>
                </div>
            </div>

            {/* Chart (Collapsible) */}
            {expanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <CreditChart data={history} />
                </div>
            )}
        </section>
    );
}
