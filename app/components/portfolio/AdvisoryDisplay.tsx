"use client";

import { AdvisoryResponse, AdvisoryAction } from '../../types/advisory';
import { CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Clock } from 'lucide-react';

interface AdvisoryDisplayProps {
    advisory: AdvisoryResponse & { cached?: boolean; created_at?: string };
}

export default function AdvisoryDisplay({ advisory }: AdvisoryDisplayProps) {
    const { summary, actions, rationale, triggers, no_action_reason, cached, created_at } = advisory;

    // Badge colors
    const getConvictionColor = (conviction: string) => {
        if (conviction === 'high') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
        if (conviction === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
    };

    const getQualityColor = (quality: string) => {
        if (quality === 'high') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
        if (quality === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
    };

    const getActionIcon = (action: AdvisoryAction['action']) => {
        switch (action) {
            case 'add': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
            case 'trim': return <TrendingDown className="w-4 h-4 text-rose-600" />;
            case 'rebalance': return <ArrowRight className="w-4 h-4 text-blue-600" />;
            case 'hold': return <CheckCircle2 className="w-4 h-4 text-neutral-600" />;
        }
    };

    if (!advisory || !summary) {
        console.error('AdvisoryDisplay: Missing advisory data', advisory);
        return null;
    }

    return (
        <div className="space-y-6 pb-20 border-t border-neutral-200 dark:border-neutral-800 pt-10 mt-10">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Intelligence Report</span>
            </div>
            {/* Summary Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Portfolio Advisory</h3>
                    <div className="flex items-center gap-2">
                        {cached && (
                            <div className="flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                Cached
                            </div>
                        )}
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getConvictionColor(summary.conviction)}`}>
                            {summary.conviction} Conviction
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getQualityColor(summary.data_quality)}`}>
                            {summary.data_quality} Quality
                        </span>
                    </div>
                </div>

                <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {summary.headline}
                </p>

                {created_at && (
                    <p className="text-xs text-neutral-400 mt-2">
                        Generated: {new Date(created_at).toLocaleString()}
                    </p>
                )}
            </div>

            {/* No Action Case */}
            {no_action_reason && (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No Action Recommended</h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{no_action_reason}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            {actions && actions.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-3">
                        Recommended Actions
                    </h4>
                    <div className="space-y-3">
                        {actions.map((action, idx) => (
                            <div key={idx} className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-start gap-3">
                                    {getActionIcon(action.action)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-neutral-900 dark:text-white capitalize">{action.action}</span>
                                            <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">{action.asset}</span>
                                        </div>

                                        {(action.from_weight_pct !== null || action.to_weight_pct !== null) && (
                                            <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2">
                                                {action.from_weight_pct !== null && (
                                                    <span>{action.from_weight_pct.toFixed(1)}%</span>
                                                )}
                                                {action.from_weight_pct !== null && action.to_weight_pct !== null && (
                                                    <ArrowRight className="w-3 h-3" />
                                                )}
                                                {action.to_weight_pct !== null && (
                                                    <span className="font-semibold">{action.to_weight_pct.toFixed(1)}%</span>
                                                )}
                                                {action.change_pct !== null && (
                                                    <span className={action.change_pct > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                        ({action.change_pct > 0 ? '+' : ''}{action.change_pct.toFixed(1)}%)
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{action.why}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rationale */}
            {rationale && rationale.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-3">
                        Rationale
                    </h4>
                    <ul className="space-y-2">
                        {rationale.map((item: any, idx) => (
                            <li key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                • {typeof item === 'string' ? item : (item.point || item.reason || item.text || JSON.stringify(item))}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Triggers */}
            {triggers && triggers.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                        <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            Monitor & Adjust If
                        </h4>
                    </div>
                    <div className="space-y-2">
                        {triggers.map((trigger, idx) => (
                            <div key={idx} className="text-sm">
                                <span className="font-semibold text-amber-800 dark:text-amber-300">If:</span>
                                <span className="text-amber-700 dark:text-amber-400 ml-1">{trigger.if}</span>
                                <br />
                                <span className="font-semibold text-amber-800 dark:text-amber-300">Then:</span>
                                <span className="text-amber-700 dark:text-amber-400 ml-1">{trigger.then}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
