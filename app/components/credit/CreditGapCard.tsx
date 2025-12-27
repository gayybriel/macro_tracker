"use client";

import { useState, useEffect, useMemo } from 'react';
import { CreditDataPoint, CreditStats } from '../../types/credit';
import CreditChart from './CreditChart';
import Sparkline from '../Sparkline';
import { TrendPoint } from '../../types';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CreditGapCard() {
    const [stats, setStats] = useState<CreditStats | null>(null);
    const [history, setHistory] = useState<CreditDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    // Hover State for Sparkline
    const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);

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

    // --- Data Prep for Sparkline ---
    // Memoize this to prevent infinite loops when onHover setState triggers re-render
    // Extract last 1 year (approx 252 trading days)
    const miniChartData: TrendPoint[] = useMemo(() => history.slice(-252).map(d => ({
        date: d.obs_date,
        value: d.gap_bps
    })), [history]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 h-[280px] animate-pulse flex flex-col justify-between">
                <div className="h-4 w-1/2 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-8 w-1/3 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-20 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
            </div>
        );
    }

    if (!stats) return null;

    // --- Value Display Logic ---
    const valueToShow = hoveredPoint?.value !== undefined ? hoveredPoint.value : stats.gap_bps;
    const dateToShow = hoveredPoint?.date || stats.as_of;

    const formattedValue = valueToShow.toFixed(0);
    const dateStr = dateToShow ? format(parseISO(dateToShow), 'MMM dd, yyyy') : 'Latest';

    // Interpretation Heuristics
    let stressLabel = "Calm";
    let stressBadgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    if (stats.gap_bps > 350) {
        stressLabel = "Elevated";
        stressBadgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    }
    if (stats.gap_bps > 500) {
        stressLabel = "High Stress";
        stressBadgeColor = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    }

    // Trend Color
    const isRising = stats.change_30d_bps > 0;
    const trendColor = isRising ? '#ef4444' : '#10b981'; // Red if gap widening (bad), Green if narrowing

    return (
        <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden ${expanded ? 'row-span-2 col-span-1 md:col-span-2 lg:col-span-3' : ''}`}>
            <div className="p-5 pb-2 flex-grow flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider truncate">
                        Credit Risk Gap
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        CREDIT
                    </span>
                </div>

                {/* Main Value Area */}
                <div className="flex flex-col mt-1 mb-4 h-14 justify-center">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
                            {formattedValue}
                        </span>
                        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-500">
                            bps
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-neutral-400">
                            {hoveredPoint ? dateStr : `Latest (${dateStr})`}
                        </span>

                        {!hoveredPoint && (
                            <div className={`flex items-center text-xs font-medium ${stats.change_30d_bps > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {stats.change_30d_bps > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                {Math.abs(stats.change_30d_bps).toFixed(0)} bps (MoM)
                            </div>
                        )}
                    </div>
                </div>

                {/* Sparkline (Hidden when expanded) */}
                {!expanded && (
                    <div className="mt-auto h-16">
                        <Sparkline
                            data={miniChartData}
                            color={trendColor}
                            onHover={setHoveredPoint}
                        />
                    </div>
                )}
            </div>

            {/* Bottom / Expanded Section */}
            <div className="bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-100 dark:border-neutral-800 px-5 py-3 transition-colors">

                {/* Collapsed State Footer */}
                {!expanded && (
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit ${stressBadgeColor}`}>
                            {stressLabel}
                        </span>
                        <button
                            onClick={() => setExpanded(true)}
                            className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                            View Chart <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Expanded Chart Area */}
                {expanded && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-4">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit ${stressBadgeColor}`}>
                                {stressLabel}
                            </span>
                            <button
                                onClick={() => setExpanded(false)}
                                className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                Hide Chart <ChevronUp className="w-3 h-3" />
                            </button>
                        </div>
                        <CreditChart data={history} />
                    </div>
                )}
            </div>
        </div>
    );
}
