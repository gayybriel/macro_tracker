"use client";

import { Info, AlertCircle, CalendarClock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

// Define the shape of the view data
export interface ExplainFeature {
    code: string;
    name: string;
    category: string;
    latest_value: number;
    display_unit: string;
    latest_date: string;
    delta_1w: number | null;
    delta_1m: number | null;
    delta_3m: number | null;

    // Lens Interpretations
    bullish_risk_assets: 'up' | 'down' | 'mixed' | null;
    bullish_bonds: 'up' | 'down' | 'mixed' | null;
    bullish_usd: 'up' | 'down' | 'mixed' | null;

    // Explanations
    meaning_short: string | null;
    significance: string | null;
    direction_notes: string | null;
    common_misread: string | null;

    // Freshness
    freshness_status: string; // 'fresh' | 'stale' | 'very_stale'
    lag_days: number;
}

interface ExplainCardProps {
    feature: ExplainFeature;
    lens: 'risk' | 'bond' | 'usd';
}

export default function ExplainCard({ feature, lens }: ExplainCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    // --- Helpers ---

    const formatValue = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    const formatDate = (dateStr: string) => format(parseISO(dateStr), 'MMM dd');

    const getDeltaColor = (val: number | null) => {
        if (val === null) return 'text-neutral-400';
        if (val > 0) return 'text-emerald-500';
        if (val < 0) return 'text-rose-500';
        return 'text-neutral-400';
    };

    const DeltaPill = ({ label, val }: { label: string, val: number | null }) => (
        <div className="flex flex-col items-center">
            <span className={`text-xs font-bold ${getDeltaColor(val)}`}>
                {val === null ? '-' : `${val > 0 ? '+' : ''}${val.toFixed(1)}`}
            </span>
            <span className="text-[9px] text-neutral-400 uppercase">{label}</span>
        </div>
    );

    // --- Lens Logic ---
    let direction: 'up' | 'down' | 'mixed' | null = null;
    if (lens === 'risk') direction = feature.bullish_risk_assets;
    if (lens === 'bond') direction = feature.bullish_bonds;
    if (lens === 'usd') direction = feature.bullish_usd;

    const LensBadge = () => {
        if (!direction) return null;

        let text = "";
        let color = "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
        let icon = null;

        if (direction === 'up') {
            text = "Bullish when ↑";
            color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
            icon = <TrendingUp className="w-3 h-3 mr-1" />;
        } else if (direction === 'down') {
            text = "Bullish when ↓";
            color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"; // Still green because it describes a bullish condition
            icon = <TrendingDown className="w-3 h-3 mr-1" />;
        } else {
            text = "Mixed / Depends";
            color = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
            icon = <Minus className="w-3 h-3 mr-1" />;
        }

        return (
            <div className={`flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors duration-300 ${color}`}>
                {/* Visual arrow to indicate the condition direction, not the badge color itself */}
                {icon}
                {text}
            </div>
        );
    };

    // --- Freshness Logic ---
    const isStale = feature.freshness_status !== 'fresh';
    const FreshnessBadge = () => {
        if (!isStale) return null;
        return (
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800/50">
                <CalendarClock className="w-3 h-3" />
                <span>stale: {feature.lag_days}d lag</span>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm relative group hover:shadow-md transition-shadow">

            {/* Top Row: Name + Code */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">
                        {feature.name}
                    </h3>
                    <span className="text-[10px] font-mono text-neutral-400">{feature.code}</span>
                </div>

                {/* Info Toggle */}
                <button
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="text-neutral-300 hover:text-blue-500 transition-colors"
                >
                    <Info className="w-4 h-4" />
                </button>
            </div>

            {/* Value Row */}
            <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatValue(feature.latest_value)}
                </span>
                <span className="text-xs font-medium text-neutral-500">{feature.display_unit}</span>
                <FreshnessBadge />
            </div>

            {/* Deltas & Date */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2 flex justify-between items-center mb-3">
                <DeltaPill label="1W" val={feature.delta_1w} />
                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
                <DeltaPill label="1M" val={feature.delta_1m} />
                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
                <DeltaPill label="3M" val={feature.delta_3m} />
            </div>

            <div className="flex justify-between items-end">
                <span className="text-[10px] text-neutral-400">
                    As of {formatDate(feature.latest_date)}
                </span>
                <LensBadge />
            </div>

            {/* Explanation Popover/Overlay */}
            {showTooltip && (
                <div
                    className="absolute inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-10 p-4 rounded-xl flex flex-col overflow-y-auto animate-in fade-in"
                    onClick={() => setShowTooltip(false)} // Click anywhere to close
                >
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold uppercase text-blue-500 tracking-wider">Indicator Guide</h4>
                        <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                            <TrendingUp className="w-4 h-4 rotate-45" /> {/* Close icon visual placeholder */}
                        </button>
                    </div>

                    <div className="space-y-3 text-sm">

                        {/* Meaning */}
                        <div>
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">What it measures</span>
                            <p className="text-neutral-800 dark:text-neutral-200 leading-snug">
                                {feature.meaning_short || "No explanation added yet."}
                            </p>
                        </div>

                        {/* Significance */}
                        {feature.significance && (
                            <div>
                                <span className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">Significance</span>
                                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed">
                                    {feature.significance}
                                </p>
                            </div>
                        )}

                        {/* Misread */}
                        {feature.common_misread && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-800/30">
                                <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase mb-0.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Common Pitfall
                                </span>
                                <p className="text-amber-800 dark:text-amber-200/80 text-xs leading-relaxed italic">
                                    {feature.common_misread}
                                </p>
                            </div>
                        )}

                        <div className="text-[10px] text-neutral-400 text-center mt-auto pt-2">
                            Tap anywhere to close
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
