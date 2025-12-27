"use client";

import { useState, useEffect } from 'react';
import { MacroSnapshot, RegimeSnapshot } from './types';
import IndicatorCard from './components/IndicatorCard';
import { Loader2, AlertCircle, Info, RefreshCw, TrendingUp, LayoutDashboard, Database, PieChart, Briefcase, Building, DollarSign } from 'lucide-react';
import { DataQualityBadge } from './components/regime/DataQualityDisplay';
import { format, parseISO } from 'date-fns';

// Portfolio Imports
import { PortfolioPosition, PortfolioGroup } from './types/portfolio';
import { groupPortfolio } from './components/portfolio/PortfolioHelper';
import PortfolioTable from './components/portfolio/PortfolioTable';
import PortfolioSummary from './components/portfolio/PortfolioSummary';
import AllocationChart from './components/portfolio/AllocationChart';

// Credit Imports (Gap Card only)
import CreditGapCard from './components/credit/CreditGapCard';

// Explain Type Import
import { ExplainFeature } from './components/explain/ExplainCard';

// Advisory Imports
import AdvisoryDisplay from './components/portfolio/AdvisoryDisplay';
import { AdvisoryResponse } from './types/advisory';

export default function Dashboard() {
  // MACRO STATE
  const [data, setData] = useState<MacroSnapshot | null>(null);
  const [regime, setRegime] = useState<RegimeSnapshot | null>(null); // derived
  const [explainData, setExplainData] = useState<ExplainFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // EXPLAIN / LENS STATE
  const [activeLens, setActiveLens] = useState<'risk' | 'bond' | 'usd'>('risk');

  // PORTFOLIO STATE
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroup[]>([]);
  const [portfolioTotal, setPortfolioTotal] = useState<number>(0);
  const [allocationData, setAllocationData] = useState<{ name: string, value: number }[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  // UI STATE
  const [activeTab, setActiveTab] = useState<'macro' | 'portfolio'>('macro');

  // ADVISORY STATE
  const [advisory, setAdvisory] = useState<(AdvisoryResponse & { cached?: boolean; created_at?: string }) | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);


  // --- FETCHERS ---

  const fetchMacroData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Macro Data
      const res = await fetch('/api/macro-snapshot', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
      }
      const json: MacroSnapshot = await res.json();
      setData(json);
      setRegime(json.regime); // Helper since it's nested

      // Fetch Explain Data in background (parallel)
      fetch('/api/explain')
        .then(r => r.json())
        .then(d => setExplainData(d))
        .catch(console.error);

    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data: PortfolioPosition[] = await res.json();

      const { groups, totalSgd, allocationByGroup } = groupPortfolio(data);
      setPortfolioGroups(groups);
      setPortfolioTotal(totalSgd);
      setAllocationData(allocationByGroup);
    } catch (e) {
      console.error("Portfolio Error", e);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-takeaways', { method: 'POST' });
      if (!res.ok) throw new Error('Generation failed');
      const { bullets } = await res.json();

      // Update local state
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          takeaways: {
            ...prev.takeaways,
            bullets,
            asof_date: prev.takeaways?.asof_date || new Date().toISOString().split('T')[0],
            confidence_label: prev.takeaways?.confidence_label || 'medium',
            max_lag_days: prev.takeaways?.max_lag_days || 0
          }
        };
      });
    } catch (e) {
      console.error(e);
      alert('Failed to generate insights. Check console.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAdvisory = async () => {
    console.log('handleGenerateAdvisory called');
    setLoadingAdvisory(true);
    try {
      console.log('Fetching advisory...');
      const res = await fetch('/api/advice/generate', { method: 'POST' });
      console.log('Advisory response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Advisory API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate advisory');
      }

      const advisoryData = await res.json();
      console.log('Advisory data received:', advisoryData);
      console.log('Setting advisory state...');
      setAdvisory(advisoryData);
      console.log('Advisory state set successfully');
    } catch (e: any) {
      console.error('Advisory generation error:', e);
      alert(`Advisory generation failed: ${e.message}`);
    } finally {
      setLoadingAdvisory(false);
      console.log('Loading state set to false');
    }
  };

  // Initial Load
  useEffect(() => {
    fetchMacroData();
    fetchPortfolio();
  }, []);

  // --- HELPERS ---

  // Helper to determine badge color
  const getBadgeColor = (label: string, type: string) => {
    const l = label.toLowerCase();
    if (['improving', 'cooling', 'easing', 'risk-on', 'high'].includes(l)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    if (['deteriorating', 're-accelerating', 'tightening', 'risk-off', 'low'].includes(l)) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
    return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
  };

  const RegimeBadge = ({ label, value, type }: { label: string, value: string, type: string }) => (
    <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 shadow-sm">
      <span className="text-[10px] uppercase font-bold text-neutral-400 mb-1">{label}</span>
      <span className={`text-xs font-semibold px-2 py-1 rounded w-fit capitalize ${getBadgeColor(value, type)}`}>
        {value}
      </span>
    </div>
  );

  const LensTab = ({ id, label, icon: Icon }: { id: 'risk' | 'bond' | 'usd', label: string, icon: any }) => (
    <button
      onClick={() => setActiveLens(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
            ${activeLens === id
          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-md'
          : 'bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
        }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );


  // Group indicators by category
  const groupedIndicators = data?.indicators.reduce((acc, indicator) => {
    const cat = indicator.category || 'Other';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(indicator);
    return acc;
  }, {} as Record<string, typeof data.indicators>);

  const categories = groupedIndicators ? Object.keys(groupedIndicators).sort() : [];
  const takeaways = data?.takeaways;

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error State (only blocking if NO data)
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-md p-6 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/30 rounded-xl shadow-sm text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Unable to Load Dashboard</h2>
          <p className="text-neutral-500 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white p-3 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* --- HEADER & TABS --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title Block */}
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-900/20">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Macro Tracker</h1>
              <p className="text-sm text-neutral-500">
                {data?.asOf ? `Data as of ${format(parseISO(data.asOf), 'MMMM dd, yyyy')}` : 'Live Dashboard'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-white dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('macro')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'macro'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Macro View
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'portfolio'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              Portfolio
            </button>
          </div>
        </div>

        {/* Global Error Toast equivalent */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={fetchMacroData} className="ml-auto underline text-sm">Retry</button>
          </div>
        )}

        {/* =========================================
            TAB CONTENT: MACRO
           ========================================= */}
        {activeTab === 'macro' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Regime Dashboard */}
            {regime && (
              <section className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  <RegimeBadge label="Growth" value={regime.growth_label} type="growth" />
                  <RegimeBadge label="Inflation" value={regime.inflation_label} type="inflation" />
                  <RegimeBadge label="Policy" value={regime.policy_label} type="policy" />
                  <RegimeBadge label="Risk" value={regime.risk_label} type="risk" />
                  <RegimeBadge label="Liquidity" value={regime.liquidity_label} type="liquidity" />
                  <RegimeBadge label="Conviction" value={regime.confidence_label} type="confidence" />
                  <DataQualityBadge regime={regime} />
                </div>

              </section>
            )}

            {/* Takeaways Section */}
            <section className="bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 w-full">
                  <Info className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Key Takeaways</h3>
                      <button
                        onClick={handleGenerateInsights}
                        disabled={generating}
                        className="text-xs flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            Spark AI Insights
                          </>
                        )}
                      </button>
                    </div>

                    {(takeaways?.bullets && takeaways.bullets.length > 0) ? (
                      <ul className="space-y-2">
                        {takeaways.bullets.map((bullet, idx) => (
                          <li key={idx} className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            • {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No takeaways available. Click the button to generate using AI.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Grouped Grids */}
            {categories.length > 0 ? (
              <div className="space-y-8 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neutral-400" />
                    Key Indicators
                  </h2>

                  {/* Lens Selector (Merged into Header) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400 uppercase mr-1 hidden md:block">Market Lens:</span>
                    <LensTab id="risk" label="Risk" icon={Briefcase} />
                    <LensTab id="bond" label="Bonds" icon={Building} />
                    <LensTab id="usd" label="USD" icon={DollarSign} />

                    <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-2" />

                    <button
                      onClick={fetchMacroData}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                      title="Refresh Macro Data"
                    >
                      <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {categories.map((category) => (
                  <section key={category}>
                    <h2 className="text-sm font-semibold text-neutral-500 mb-3 uppercase tracking-wider border-l-4 border-neutral-300 dark:border-neutral-700 pl-3">
                      {category}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedIndicators && groupedIndicators[category]?.map((indicator) => {
                        const explain = explainData.find(e => e.code === indicator.code);
                        return (
                          <IndicatorCard
                            key={indicator.code}
                            indicator={indicator}
                            explainFeature={explain}
                            lens={activeLens}
                          />
                        );
                      })}
                      {/* Inject Credit Gap Card into Credit Section */}
                      {category.toLowerCase().includes('credit') && (
                        <CreditGapCard />
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* No Data State */
              <div className="text-center py-20 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <p>No active indicators found.</p>
              </div>
            )}
          </div>
        )}


        {/* =========================================
            TAB CONTENT: PORTFOLIO
           ========================================= */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-neutral-400" />
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 tracking-tight">Portfolio Overview</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAdvisory}
                  disabled={loadingAdvisory}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {loadingAdvisory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-4 h-4" />
                      Generate Advisory
                    </>
                  )}
                </button>
                <button
                  onClick={fetchPortfolio}
                  className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  title="Refresh Portfolio"
                >
                  <RefreshCw className={`w-4 h-4 text-neutral-500 ${loadingPortfolio ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingPortfolio && portfolioGroups.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-40 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 animate-pulse" />
                <div className="h-40 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 animate-pulse" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <PortfolioSummary totalSgd={portfolioTotal} groups={portfolioGroups} />
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-center items-center">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 self-start w-full text-center">Allocation</span>
                    <AllocationChart data={allocationData} />
                  </div>
                </div>

                <PortfolioTable groups={portfolioGroups} totalSgd={portfolioTotal} />

                {/* Advisory Display */}
                {advisory && <AdvisoryDisplay advisory={advisory} />}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
