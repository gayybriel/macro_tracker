"use client";

import { useState } from 'react';
import { RegimeSnapshot } from '../../types';
import { AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface DataQualityProps {
    regime: RegimeSnapshot;
    compact?: boolean; // Badge mode vs full mode
}

export default function DataQualityDisplay({ regime, compact = false }: DataQualityProps) {
    const [expanded, setExpanded] = useState(false);

    const {
        data_quality_score,
        data_quality_label,
        missing_count,
        stale_count,
        no_delta_count,
        max_regime_lag_days,
        missing_codes,
        stale_codes,
        no_delta_codes
    } = regime;

    // Helper to safely parse code arrays (they might be strings, arrays, or null)
    const parseCodeArray = (codes: string[] | string | null | undefined): string[] => {
        if (!codes) return [];
        if (Array.isArray(codes)) return codes;
        if (typeof codes === 'string') {
            try {
                const parsed = JSON.parse(codes);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return codes.split(',').map(c => c.trim()).filter(c => c);
            }
        }
        return [];
    };

    const missingCodesArray = parseCodeArray(missing_codes);
    const staleCodesArray = parseCodeArray(stale_codes);
    const noDeltaCodesArray = parseCodeArray(no_delta_codes);

    // Badge color based on quality label
    const getBadgeColor = () => {
        if (data_quality_label === 'high') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
        if (data_quality_label === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
    };

    const getIcon = () => {
        if (data_quality_label === 'high') return <CheckCircle2 className="w-4 h-4" />;
        if (data_quality_label === 'medium') return <AlertCircle className="w-4 h-4" />;
        return <AlertTriangle className="w-4 h-4" />;
    };

    const qualityPercent = Math.round(data_quality_score * 100);
    const hasIssues = missing_count > 0 || stale_count > 0 || no_delta_count > 0;

    // Compact Badge Mode (matches RegimeBadge styling)
    if (compact) {
        return (
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer text-left w-full"
            >
                <span className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Data Quality</span>
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${getBadgeColor()}`}>
                        {data_quality_label}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>
            </button>
        );
    }

    // Expanded Detail View
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Data Quality Details
                </h3>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getBadgeColor()}`}>
                    {getIcon()}
                    {data_quality_label}
                </div>
            </div>

            {/* Quality Score Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Quality Score</span>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{qualityPercent}%</span>
                </div>
                <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${data_quality_label === 'high' ? 'bg-emerald-500' :
                                data_quality_label === 'medium' ? 'bg-amber-500' :
                                    'bg-rose-500'
                            }`}
                        style={{ width: `${qualityPercent}%` }}
                    />
                </div>
            </div>

            {/* Max Lag */}
            {max_regime_lag_days !== null && max_regime_lag_days > 0 && (
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                    <span className="font-semibold">Max lag:</span> {max_regime_lag_days} days
                </div>
            )}

            {/* Warning Rows for Issues */}
            {hasIssues && (
                <div className="space-y-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {missing_count > 0 && (
                        <div className="text-xs">
                            <div className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                                Missing: {missing_count}
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-[10px] flex flex-wrap gap-1">
                                {missingCodesArray.map(code => (
                                    <span key={code} className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {stale_count > 0 && (
                        <div className="text-xs">
                            <div className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                Stale: {stale_count}
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-[10px] flex flex-wrap gap-1">
                                {staleCodesArray.map(code => (
                                    <span key={code} className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {no_delta_count > 0 && (
                        <div className="text-xs">
                            <div className="font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                                No delta: {no_delta_count}
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-[10px] flex flex-wrap gap-1">
                                {noDeltaCodesArray.map(code => (
                                    <span key={code} className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Caution Note for Low Quality */}
                    {data_quality_label === 'low' && (
                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-lg p-2 mt-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                                    Some indicators are stale/missing; interpret regime with caution.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Export both compact badge and expanded view wrapper
export function DataQualityBadge({ regime }: { regime: RegimeSnapshot }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <>
            <div onClick={() => setShowDetails(!showDetails)}>
                <DataQualityDisplay regime={regime} compact />
            </div>

            {showDetails && (
                <div className="col-span-full">
                    <DataQualityDisplay regime={regime} />
                    <button
                        onClick={() => setShowDetails(false)}
                        className="mt-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 mx-auto"
                    >
                        Hide Details <ChevronUp className="w-3 h-3" />
                    </button>
                </div>
            )}
        </>
    );
}
