"use client";

import { useState, useEffect } from 'react';
import ExplainCard, { ExplainFeature } from './ExplainCard';
import { Loader2, GraduationCap, Briefcase, DollarSign, Building } from 'lucide-react';

export default function ExplainGrid() {
    const [features, setFeatures] = useState<ExplainFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [lens, setLens] = useState<'risk' | 'bond' | 'usd'>('risk');

    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                const res = await fetch('/api/explain');
                if (res.ok) {
                    const data = await res.json();
                    setFeatures(data);
                }
            } catch (e) {
                console.error("Failed to fetch features", e);
            } finally {
                setLoading(false);
            }
        };
        fetchFeatures();
    }, []);

    // Lens Selector Tabs
    const LensTab = ({ id, label, icon: Icon }: { id: 'risk' | 'bond' | 'usd', label: string, icon: any }) => (
        <button
            onClick={() => setLens(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
                ${lens === id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg scale-105'
                    : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading Explain Mode...</p>
            </div>
        );
    }

    // Grouping by category
    const grouped = features.reduce((acc, f) => {
        const cat = f.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(f);
        return acc;
    }, {} as Record<string, ExplainFeature[]>);

    const categories = Object.keys(grouped).sort();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-100/50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="text-center md:text-left">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2 justify-center md:justify-start">
                        <GraduationCap className="w-6 h-6 text-blue-500" />
                        Indicator Guide
                    </h2>
                    <p className="text-sm text-neutral-500 max-w-md">
                        Understand what drives the dashboard. Switch "Market Lenses" to see how different assets interpret the same data.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <LensTab id="risk" label="Risk Assets" icon={Briefcase} />
                    <LensTab id="bond" label="Bonds / Rates" icon={Building} />
                    <LensTab id="usd" label="US Dollar" icon={DollarSign} />
                </div>
            </div>

            {/* Grid */}
            <div className="space-y-12">
                {categories.map(cat => (
                    <section key={cat}>
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-6">
                            {cat}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {grouped[cat].map(feature => (
                                <ExplainCard key={feature.code} feature={feature} lens={lens} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {features.length === 0 && (
                <div className="text-center py-20 text-neutral-400">
                    No explanation data found.
                </div>
            )}
        </div>
    );
}
