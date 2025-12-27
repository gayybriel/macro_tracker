// Portfolio Advisory Types

export interface AdvisoryAction {
    action: 'rebalance' | 'add' | 'trim' | 'hold';
    asset: string;
    from_weight_pct: number | null;
    to_weight_pct: number | null;
    change_pct: number | null;
    why: string;
}

export interface AdvisoryRationale {
    point: string;
}

export interface AdvisoryTrigger {
    if: string;
    then: string;
}

export interface AdvisorySummary {
    headline: string;
    conviction: 'low' | 'medium' | 'high';
    data_quality: 'low' | 'medium' | 'high';
}

export interface AdvisoryResponse {
    summary: AdvisorySummary;
    actions: AdvisoryAction[];
    rationale: AdvisoryRationale[];
    triggers: AdvisoryTrigger[];
    no_action_reason: string | null;
}

export interface ClaudePayloadMacroRegime {
    asof_date: string;
    growth_label: string;
    inflation_label: string;
    policy_label: string;
    risk_label: string;
    liquidity_label: string;
    conviction_label: string;
    data_quality_label: 'high' | 'medium' | 'low';
    data_quality_score: number;
    max_regime_lag_days: number | null;
}

export interface ClaudePayloadIndicator {
    code: string;
    name: string;
    category: string;
    latest_date: string | null;
    latest_value: number | null;
    delta_1m: number | null;
    delta_3m: number | null;
    zscore_3y: number | null;
    pctile_10y: number | null;
    std_3y: number | null;
}

export interface ClaudePayloadHolding {
    ticker: string;
    asset_name: string;
    asset_class: string;
    units: number;
    price_latest: number;
    price_date_used: string;
    fx_rate: number;
    fx_date_used: string;
    value_sgd: number;
    weight_pct: number;
}

export interface ClaudePayloadPortfolio {
    total_value_sgd: number;
    subtotals: {
        asset_class: string;
        total_sgd: number;
        weight_pct: number;
    }[];
    holdings: ClaudePayloadHolding[];
}

export interface ClaudePayload {
    asof: string;
    base_currency: string;
    macro_regime: ClaudePayloadMacroRegime;
    macro_drivers: ClaudePayloadIndicator[];
    portfolio: ClaudePayloadPortfolio;
    constraints: {
        max_single_position_pct: number;
        preferred_rebalance_threshold_pct: number;
    };
}

export interface CachedAdviceRow {
    id?: string;
    user_id?: string;
    regime_asof_date: string;
    payload_hash: string;
    model: string;
    prompt_version: string;
    payload: ClaudePayload;
    response: AdvisoryResponse;
    created_at?: string;
}
