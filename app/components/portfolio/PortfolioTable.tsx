"use client";

import { useState } from 'react';
import { PortfolioGroup, PortfolioPosition } from '../../types/portfolio';
import { ChevronDown, ChevronRight, AlertCircle, Edit2, Check, X, Loader2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Props {
    groups: PortfolioGroup[];
    totalSgd: number;
}

const checkFreshness = (pos: PortfolioPosition) => {
    const today = new Date();
    const warnings = [];

    // Price Age Check (skip cash)
    if (pos.asset_type !== 'cash' && pos.price_date_used) {
        const date = parseISO(pos.price_date_used);
        const days = differenceInDays(today, date);
        if (days > 7) warnings.push(`Stale Price (${format(date, 'MMM dd')})`);
    }
    // FX Age Check (skip SGD)
    if (pos.asset_ccy !== 'SGD' && pos.fx_date_used) {
        const days = differenceInDays(today, parseISO(pos.fx_date_used));
        if (days > 7) warnings.push('Stale FX');
    }
    if (pos.price_used === null && pos.asset_type !== 'cash') {
        warnings.push('Missing Price');
    }

    return warnings;
};

export default function PortfolioTable({ groups, totalSgd }: Props) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        cash: true,
        core: true,
        crypto: true,
        others: true
    });

    // Editing State
    // ID key uses code to be unique enough for view
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const startEditing = (item: PortfolioPosition, key: string) => {
        setEditingKey(key);
        setEditValue(item.quantity?.toString() || "");
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setEditValue("");
        setIsSaving(false);
    };

    const saveEditing = async (item: PortfolioPosition) => {
        const newQty = parseFloat(editValue);
        if (isNaN(newQty)) {
            alert("Invalid quantity");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/portfolio/update-units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: item.code,
                    new_quantity: newQty
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }

            // Success - Reload page to refresh data (simple approach)
            window.location.reload();
        } catch (e: any) {
            alert(e.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 p-3 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 hidden sm:grid">
                <div className="col-span-3 pl-8">Asset</div>
                <div className="col-span-2 text-right">Units</div>
                <div className="col-span-3 text-right">Price</div>
                <div className="col-span-3 text-right">Value (SGD)</div>
                <div className="col-span-1 text-right pr-2">%</div>
            </div>

            {/* Mobile Header */}
            <div className="grid grid-cols-12 gap-2 p-3 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 sm:hidden">
                <div className="col-span-5 pl-8">Asset</div>
                <div className="col-span-4 text-right">Value (SGD)</div>
                <div className="col-span-3 text-right pr-2">Units</div>
            </div>

            {groups.map(group => {
                const isExpanded = expandedGroups[group.id];
                return (
                    <div key={group.id} className="border-b last:border-0 border-neutral-100 dark:border-neutral-800">
                        {/* Group Header */}
                        <div
                            className="grid grid-cols-12 gap-2 py-2 px-3 bg-neutral-50 dark:bg-neutral-900 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors select-none"
                            onClick={() => toggleGroup(group.id)}
                        >
                            <div className="col-span-6 flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{group.label}</span>
                                <span className="text-xs text-neutral-400 font-normal">({group.items.length})</span>
                            </div>
                            <div className="col-span-6 flex items-center justify-end gap-3 pr-2">
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                                    {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(group.totalSgd)}
                                </span>
                                <span className="text-xs font-medium text-neutral-500 w-10 text-right">
                                    {group.weightPct.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        {isExpanded && (
                            <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                                {group.items.map((item, idx) => {
                                    const warnings = checkFreshness(item);
                                    const itemWeight = totalSgd > 0 ? ((item.value_sgd || 0) / totalSgd * 100) : 0;
                                    const uniqueKey = item.code;
                                    const isEditing = editingKey === uniqueKey;

                                    return (
                                        <div key={idx} className="grid grid-cols-12 gap-2 py-3 px-3 text-sm hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors items-center">
                                            {/* Asset */}
                                            <div className="col-span-5 sm:col-span-3 pl-8 relative">
                                                <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2" title={item.asset_name}>
                                                    {item.asset_name}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                                                    <span className="font-mono">{item.code}</span>
                                                    {warnings.map((w, i) => (
                                                        <span key={i} className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-100 whitespace-nowrap">
                                                            <AlertCircle className="w-2.5 h-2.5" />
                                                            {w}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Units (Editable) */}
                                            <div className="col-span-3 sm:col-span-2 text-right text-xs sm:order-none order-3 flex justify-end">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-20 px-1 py-0.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEditing(item);
                                                                if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                            disabled={isSaving}
                                                        />
                                                        {isSaving ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                                                        ) : (
                                                            <>
                                                                <button onClick={() => saveEditing(item)} className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900 rounded text-green-600">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={cancelEditing} className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="group flex items-center justify-end gap-2 cursor-pointer py-1 px-2 -mr-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                        onClick={() => startEditing(item, uniqueKey)}
                                                        title="Click to edit units"
                                                    >
                                                        <span className="font-mono text-neutral-600 dark:text-neutral-400">
                                                            {item.quantity ? item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '-'}
                                                        </span>
                                                        <Edit2 className="w-3 h-3 text-neutral-300 group-hover:text-neutral-500 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price (Desktop Only) */}
                                            <div className="col-span-3 hidden sm:flex flex-col items-end justify-center">
                                                <div className="font-mono text-neutral-700 dark:text-neutral-300">
                                                    {item.price_used ? item.price_used.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                </div>
                                                <div className="text-[10px] text-neutral-400">{item.asset_ccy}</div>
                                            </div>

                                            {/* Value SGD */}
                                            <div className="col-span-4 sm:col-span-3 flex items-center justify-end font-medium text-neutral-900 dark:text-neutral-100 sm:order-none order-2">
                                                {item.value_sgd ? Math.round(item.value_sgd).toLocaleString() : '-'}
                                            </div>

                                            {/* Weight (Desktop Only) */}
                                            <div className="col-span-1 hidden sm:flex justify-end text-neutral-500 pr-2">
                                                {itemWeight.toFixed(1)}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
