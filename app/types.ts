export interface TrendPoint {
    date: string;
    value: number | null;
}

export interface RegimeSnapshot {
    asof_date: string;
    max_lag_days: number | null;

    growth_score: number;
    growth_label: string;

    inflation_score: number;
    inflation_label: string;

    policy_score: number;
    policy_label: string;

    risk_score: number;
    risk_label: string;

    liquidity_score: number;
    liquidity_label: string;

    confidence_score: number;
    confidence_label: string;

    vix_latest: number | null;
    fsi_latest: number | null;
    nfci_latest: number | null;
    core_pce_latest: number | null;

    // Data Quality Metrics
    data_quality_score: number;
    data_quality_label: 'high' | 'medium' | 'low';
    missing_count: number;
    stale_count: number;
    no_delta_count: number;
    max_regime_lag_days: number | null;
    missing_codes: string[];
    stale_codes: string[];
    no_delta_codes: string[];
}

export interface Indicator {
    // Metadata
    code: string;
    name: string;
    category: string;
    display_unit: string;

    // Latest Data
    latest_date: string | null;
    latest_value: number | null;

    // Deltas
    value_1w: number | null;
    delta_1w: number | null;

    value_1m: number | null;
    delta_1m: number | null;

    value_3m: number | null;
    delta_3m: number | null;

    // Stats
    pctile_10y: number | null;
    zscore_3y: number | null;
    mean_3y: number | null;
    std_3y: number | null;

    // Trend (fetched separately and attached)
    trend: TrendPoint[];
}

export interface RegimeTakeaways {
    asof_date: string;
    bullets: string[];
    confidence_label: string;
    max_lag_days: number | null;
}

export interface MacroSnapshot {
    asOf: string;
    regime: RegimeSnapshot | null;
    takeaways: RegimeTakeaways | null;
    indicators: Indicator[];
}

// Database View Types (matches exact DB output)
export interface DBRegimeSnapshot extends RegimeSnapshot { }

export interface DBIndicatorFeature {
    code: string;
    name: string;
    category: string;
    display_unit: string;
    latest_date: string | null;
    latest_value: number | null;
    value_1w: number | null;
    delta_1w: number | null;
    value_1m: number | null;
    delta_1m: number | null;
    value_3m: number | null;
    delta_3m: number | null;
    pctile_10y: number | null;
    zscore_3y: number | null;
    mean_3y: number | null;
    std_3y: number | null;
}
