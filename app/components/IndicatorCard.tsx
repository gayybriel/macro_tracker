"use client";

import { useState, useEffect } from 'react';
import { Indicator, TrendPoint } from '../types';
import Sparkline from './Sparkline';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Sparkles, Loader2, ChevronDown, ChevronUp, Info, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ExplainFeature } from './explain/ExplainCard';

interface IndicatorCardProps {
    indicator: Indicator;
    explainFeature?: ExplainFeature;
    lens?: 'risk' | 'bond' | 'usd';
}

// ... Rich Insight Interfaces ...
interface RichInsight {
    headline: string;
    signal_label: string;
    confidence: number;
    confidence_reason: string;
    what_it_measures: string;
    directionality: {
        higher_is: string;
        notes: string;
    };
    now: {
        latest_date: string;
        latest_value: number;
        context: {
            pctile_10y: number | null;
            zscore_3y: number | null;
        };
    };
    momentum: {
        delta_1w: number | null;
        delta_1m: number | null;
        delta_3m: number | null;
        momentum_label: string;
    };
    watch_levels: {
        bullish_trigger: { level: number | null; direction: string; why: string };
        bearish_trigger: { level: number | null; direction: string; why: string };
        notes: string;
    };
    recent_pattern: string;
    narrative_bullets: Array<{ title: string; text: string }>;
    implications: {
        asset_impact: Array<{ asset: string; impact: string; why: string }>;
        positioning_tilt: {
            equity_beta: string;
            duration: string;
            credit_risk: string;
            cash_buffer: string;
        };
    };
    data_quality?: {
        missing_fields: string[];
    };
}

interface InsightData {
    status: 'pending' | 'done' | 'error';
    insight_json?: RichInsight;
    headline?: string;
    confidence?: number;
    signal_label?: string;
    error_message?: string;
    model?: string;
}

export default function IndicatorCard({ indicator, explainFeature, lens }: IndicatorCardProps) {
    const { code, name, latest_value, latest_date, trend, display_unit, category, delta_1m } = indicator;
    const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);

    // Insight State
    const [showInsight, setShowInsight] = useState(false);
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [polling, setPolling] = useState(false);

    // Explain Popover State
    const [showExplain, setShowExplain] = useState(false);

    // Auto-fetch insight on mount
    useEffect(() => {
        if (!insight) {
            generateInsight();
        }
    }, [code]);

    const handleToggleExpand = () => {
        setShowInsight(!showInsight);
    };

    const generateInsight = async () => {
        setLoadingInsight(true);
        try {
            const res = await fetch('/api/indicator-insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();

            if (data.status === 'pending') {
                setPolling(true);
                setInsight(data);
            } else {
                setInsight(data);
                setPolling(false);
            }
        } catch (e) {
            console.error(e);
            setInsight({ status: 'error', error_message: 'Failed to request insight' });
        } finally {
            setLoadingInsight(false);
        }
    };

    // Polling effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (polling) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/indicator-insight', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    const data = await res.json();
                    if (data.status === 'done' || data.status === 'error') {
                        setInsight(data);
                        setPolling(false);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [polling, code]);


    // Determine value to show
    const valueToShow = hoveredPoint?.value !== undefined ? hoveredPoint.value : latest_value;
    const dateToShow = hoveredPoint?.date || latest_date;

    const formattedValue = (valueToShow !== undefined && valueToShow !== null)
        ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(valueToShow)
        : '--';

    const dateStr = dateToShow
        ? format(parseISO(dateToShow), 'MMM dd, yyyy')
        : 'No Data';

    const firstVal = trend[0]?.value;
    const lastVal = trend[trend.length - 1]?.value;
    const isDown = (firstVal != null && lastVal != null && lastVal < firstVal);

    const categoryMap: Record<string, string> = {
        inflation: 'bg-orange-500/10 text-orange-500',
        labour: 'bg-blue-500/10 text-blue-500',
        growth: 'bg-green-500/10 text-green-500',
        rates: 'bg-purple-500/10 text-purple-500',
        default: 'bg-neutral-500/10 text-neutral-500',
    };

    const catKey = Object.keys(categoryMap).find(k => category.toLowerCase().includes(k)) || 'default';
    const catStyle = categoryMap[catKey];

    const showDelta = !hoveredPoint && delta_1m !== null && delta_1m !== undefined;
    const deltaIsPositive = (delta_1m ?? 0) > 0;

    // --- Lens Badge Logic ---
    const getLensBadge = () => {
        if (!explainFeature || !lens) return null;

        let direction: 'up' | 'down' | 'mixed' | null = null;
        if (lens === 'risk') direction = explainFeature.bullish_risk_assets;
        if (lens === 'bond') direction = explainFeature.bullish_bonds;
        if (lens === 'usd') direction = explainFeature.bullish_usd;

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
            color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
            icon = <TrendingDown className="w-3 h-3 mr-1" />;
        } else {
            text = "Mixed";
            color = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
            icon = <Minus className="w-3 h-3 mr-1" />;
        }

        return (
            <div className={`mt-2 flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors duration-300 w-fit ${color}`}>
                {icon}
                {text}
            </div>
        );
    };

    // --- Helper for Signal Badge ---
    const getSignalBadge = (label?: string) => {
        if (!label) return null;
        const isBullish = label.toLowerCase().includes('bull');
        const isBearish = label.toLowerCase().includes('bear');
        const style = isBullish
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
            : isBearish
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';

        return (
            <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit ${style}`}>
                {label}
            </div>
        );
    };

    // --- Rich Rendering Helpers ---
    const renderRichInsight = (data?: RichInsight) => {
        if (!data) return null;

        return (
            <div className="space-y-4 text-xs mt-3 animate-in fade-in slide-in-from-top-1 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                {/* Narrative Bullets */}
                <div className="space-y-2">
                    {data.narrative_bullets?.map((bullet, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{bullet.title}</span>
                            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{bullet.text}</p>
                        </div>
                    ))}
                </div>

                {/* Watch Levels aka Triggers */}
                {(data.watch_levels?.bullish_trigger?.level || data.watch_levels?.bearish_trigger?.level) && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 space-y-2 border border-neutral-100 dark:border-neutral-700/50">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Watch Triggers</span>

                        {data.watch_levels.bullish_trigger?.level !== null && (
                            <div className="flex items-start gap-2 text-[11px]">
                                <span className="text-emerald-600 font-bold shrink-0">BULLISH</span>
                                <div className="text-neutral-600 dark:text-neutral-400">
                                    if {data.watch_levels.bullish_trigger.direction} <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{data.watch_levels.bullish_trigger.level}</span>
                                    <span className="opacity-75"> — {data.watch_levels.bullish_trigger.why}</span>
                                </div>
                            </div>
                        )}
                        {data.watch_levels.bearish_trigger?.level !== null && (
                            <div className="flex items-start gap-2 text-[11px]">
                                <span className="text-rose-600 font-bold shrink-0">BEARISH</span>
                                <div className="text-neutral-600 dark:text-neutral-400">
                                    if {data.watch_levels.bearish_trigger.direction} <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{data.watch_levels.bearish_trigger.level}</span>
                                    <span className="opacity-75"> — {data.watch_levels.bearish_trigger.why}</span>
                                </div>
                            </div>
                        )}
                        {data.watch_levels.notes && (
                            <div className="text-[10px] text-neutral-400 italic mt-1 pt-1 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                                Note: {data.watch_levels.notes}
                            </div>
                        )}
                    </div>
                )}

                {/* Implications Grid */}
                {data.implications && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Asset Impact */}
                        <div>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1.5">Asset Impact</span>
                            <div className="space-y-1.5">
                                {data.implications.asset_impact?.map((imp, i) => (
                                    <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 rounded text-[11px]">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-semibold capitalize text-neutral-800 dark:text-neutral-200">{imp.asset}</span>
                                            <span className={`text-[9px] uppercase font-bold px-1 rounded ${imp.impact === 'supportive' ? 'bg-emerald-50 text-emerald-600' :
                                                imp.impact === 'headwind' ? 'bg-rose-50 text-rose-600' : 'bg-neutral-100 text-neutral-500'
                                                }`}>{imp.impact}</span>
                                        </div>
                                        <div className="text-neutral-500 leading-tight text-[10px]">{imp.why}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Positioning */}
                        <div>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1.5">Positioning</span>
                            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-2 space-y-1">
                                {Object.entries(data.implications.positioning_tilt || {}).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center text-[11px]">
                                        <span className="text-neutral-500 capitalize">{key.replace('_', ' ')}</span>
                                        <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] uppercase ${val === 'increase' ? 'text-emerald-600 bg-emerald-50' :
                                            val === 'reduce' ? 'text-rose-600 bg-rose-50' : 'text-neutral-400 bg-neutral-50'
                                            }`}>{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-[9px] text-neutral-300 dark:text-neutral-600 text-right pt-2">
                    Generated by {insight?.model || 'AI'}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">

            {/* Popover for Explanation */}
            {showExplain && explainFeature && (
                <div
                    className="absolute inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-20 p-4 flex flex-col overflow-y-auto animate-in fade-in"
                    onClick={() => setShowExplain(false)}
                >
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold uppercase text-blue-500 tracking-wider">Indicator Guide</h4>
                        <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                            <TrendingUp className="w-4 h-4 rotate-45" />
                        </button>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">What it measures</span>
                            <p className="text-neutral-800 dark:text-neutral-200 leading-snug">
                                {explainFeature.meaning_short || "No explanation added yet."}
                            </p>
                        </div>

                        {explainFeature.significance && (
                            <div>
                                <span className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">Significance</span>
                                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed">
                                    {explainFeature.significance}
                                </p>
                            </div>
                        )}

                        {explainFeature.common_misread && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-800/30">
                                <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase mb-0.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Common Pitfall
                                </span>
                                <p className="text-amber-800 dark:text-amber-200/80 text-xs leading-relaxed italic">
                                    {explainFeature.common_misread}
                                </p>
                            </div>
                        )}
                        <div className="text-[10px] text-neutral-400 text-center mt-auto pt-2">Tap to close</div>
                    </div>
                </div>
            )}


            <div className="p-5 pb-2">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-1 min-w-0">
                        <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider truncate pr-1" title={name}>
                            {name}
                        </h3>
                        {/* Info Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowExplain(true); }}
                            className="text-neutral-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${catStyle}`}>
                        {category}
                    </span>
                </div>

                <div className="flex flex-col mt-1 mb-4 h-14 justify-center">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
                            {formattedValue}
                        </span>
                        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-500">
                            {display_unit}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-neutral-400">
                            {hoveredPoint ? dateStr : `Latest (${dateStr})`}
                        </span>

                        {showDelta && delta_1m !== 0 && (
                            <div className={`flex items-center text-xs font-medium ${deltaIsPositive ? 'text-emerald-600' : 'text-rose-600'} bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded`}>
                                {deltaIsPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(delta_1m!).toFixed(2)} MoM
                            </div>
                        )}
                    </div>
                </div>

                {/* Lens Badge */}
                {getLensBadge()}

                <div className="mt-auto h-16 pt-2">
                    <Sparkline
                        data={trend}
                        color={isDown ? '#ef4444' : '#10b981'}
                        onHover={setHoveredPoint}
                    />
                </div>
            </div>

            {/* AI Insight Section */}
            <div className="bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-100 dark:border-neutral-800 px-5 py-3 transition-colors">
                {/* 1. Loading/Pending State */}
                {loadingInsight || polling || (!insight && !polling) ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {polling ? 'Analyzing market data...' : 'Waiting for connection...'}
                    </div>
                ) : insight?.status === 'error' ? (
                    <div className="text-xs text-red-500">
                        Error: {insight.error_message || 'Insight unavailable'}
                    </div>
                ) : insight?.status === 'done' && insight.insight_json ? (
                    /* 2. Done State: Display Headline Always */
                    <div className="flex flex-col gap-2">
                        {/* Header Row: Signal Badge & Confidence */}
                        <div className="flex items-center justify-between">
                            {getSignalBadge(insight.insight_json.signal_label)}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Conf.</span>
                                <span className="font-mono text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                                    {(insight.insight_json.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">
                            {insight.insight_json.headline}
                        </h4>

                        {/* Expand Button */}
                        <button
                            onClick={handleToggleExpand}
                            className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors uppercase tracking-wider w-fit mt-1 focus:outline-none"
                        >
                            {showInsight ? 'Show Less' : 'Deep Dive'}
                            {showInsight ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Expanded Content */}
                        {showInsight && renderRichInsight(insight.insight_json)}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
