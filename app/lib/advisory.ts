import crypto from 'crypto';
import {
    ClaudePayload,
    ClaudePayloadMacroRegime,
    ClaudePayloadIndicator,
    ClaudePayloadPortfolio,
    AdvisoryResponse,
    CachedAdviceRow
} from '../types/advisory';

const REGIME_CODES = [
    'vix', 'nfci', 'fsi', 'core_pce_yoy', 'unemployment_rate',
    'industrial_prod_yoy', 'retail_sales_yoy', 'fed_funds_rate'
];

const CLAUDE_MODEL = 'claude-haiku-4-5';
const PROMPT_VERSION = 'v1';

export async function buildClaudePayload(): Promise<ClaudePayload> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
    };

    // 1. Fetch regime snapshot
    const regimeUrl = `${supabaseUrl}/rest/v1/v_regime_snapshot?order=asof_date.desc&limit=1`;
    const regimeRes = await fetch(regimeUrl, { headers, cache: 'no-store' });
    if (!regimeRes.ok) throw new Error('Failed to fetch regime snapshot');
    const regimeData = await regimeRes.json();
    const regime = regimeData[0];

    // 2. Fetch indicators
    const codesParam = REGIME_CODES.map(c => `"${c}"`).join(',');
    const indicatorsUrl = `${supabaseUrl}/rest/v1/v_indicator_features?select=code,name,category,latest_date,latest_value,delta_1m,delta_3m,zscore_3y,pctile_10y,std_3y&code=in.(${codesParam})`;
    const indicatorsRes = await fetch(indicatorsUrl, { headers, cache: 'no-store' });
    if (!indicatorsRes.ok) throw new Error('Failed to fetch indicators');
    const indicators: ClaudePayloadIndicator[] = await indicatorsRes.json();

    // 3. Fetch portfolio
    const portfolioUrl = `${supabaseUrl}/rest/v1/v_portfolio_positions_valued_sgd?select=*`;
    const portfolioRes = await fetch(portfolioUrl, { headers, cache: 'no-store' });
    if (!portfolioRes.ok) {
        const errText = await portfolioRes.text();
        throw new Error(`Failed to fetch portfolio: ${portfolioRes.status} - ${errText}`);
    }
    const holdings = await portfolioRes.json();

    // Aggregate portfolio
    const totalValue = holdings.reduce((sum: number, h: any) => sum + (h.value_sgd || 0), 0);

    const assetClassMap = new Map<string, number>();
    holdings.forEach((h: any) => {
        const assetClass = h.asset_class || h.asset_type || 'Other';
        const current = assetClassMap.get(assetClass) || 0;
        assetClassMap.set(assetClass, current + (h.value_sgd || 0));
    });

    const subtotals = Array.from(assetClassMap.entries()).map(([asset_class, total_sgd]) => ({
        asset_class,
        total_sgd,
        weight_pct: totalValue > 0 ? (total_sgd / totalValue) * 100 : 0
    }));

    const portfolio: ClaudePayloadPortfolio = {
        total_value_sgd: totalValue,
        subtotals,
        holdings: holdings.map((h: any) => ({
            ticker: h.ticker || h.code,
            asset_name: h.asset_name,
            asset_class: h.asset_class || h.asset_type || 'Other',
            units: h.units ?? h.quantity,
            price_latest: h.price_latest ?? h.price_used,
            price_date_used: h.price_date_used,
            fx_rate: h.fx_rate ?? h.sgd_per_ccy,
            fx_date_used: h.fx_date_used,
            value_sgd: h.value_sgd,
            weight_pct: totalValue > 0 ? ((h.value_sgd || 0) / totalValue) * 100 : h.weight_pct
        }))
    };

    // 4. Assemble payload
    const macroRegime: ClaudePayloadMacroRegime = {
        asof_date: regime.asof_date,
        growth_label: regime.growth_label,
        inflation_label: regime.inflation_label,
        policy_label: regime.policy_label,
        risk_label: regime.risk_label,
        liquidity_label: regime.liquidity_label,
        conviction_label: regime.confidence_label,
        data_quality_label: regime.data_quality_label,
        data_quality_score: regime.data_quality_score,
        max_regime_lag_days: regime.max_regime_lag_days
    };

    return {
        asof: regime.asof_date,
        base_currency: 'SGD',
        macro_regime: macroRegime,
        macro_drivers: indicators,
        portfolio,
        constraints: {
            max_single_position_pct: 20,
            preferred_rebalance_threshold_pct: 5
        }
    };
}

export function computePayloadHash(payload: ClaudePayload): string {
    // Stable stringify to ensure consistent hashing
    const stableStr = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(stableStr).digest('hex');
}

export async function getCachedAdvice(
    regimeAsofDate: string,
    payloadHash: string
): Promise<CachedAdviceRow | null> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) return null;

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
    };

    const url = `${supabaseUrl}/rest/v1/llm_portfolio_advice?regime_asof_date=eq.${regimeAsofDate}&payload_hash=eq.${payloadHash}&model=eq.${CLAUDE_MODEL}&prompt_version=eq.${PROMPT_VERSION}&limit=1`;

    try {
        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.length === 0) return null;

        return {
            ...data[0],
            response: data[0].response,
            cached: true
        };
    } catch {
        return null;
    }
}

export async function storeCachedAdvice(
    regimeAsofDate: string,
    payloadHash: string,
    payload: ClaudePayload,
    adviceJson: AdvisoryResponse
): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    };

    const body = {
        user_id: '00000000-0000-0000-0000-000000000000', // System user for service role inserts
        regime_asof_date: regimeAsofDate,
        payload_hash: payloadHash,
        model: CLAUDE_MODEL,
        prompt_version: PROMPT_VERSION,
        payload: payload,
        response: adviceJson
    };

    const url = `${supabaseUrl}/rest/v1/llm_portfolio_advice`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error(`Cache storage failed: ${res.status} - ${errText}`);
        } else {
            console.log('Cache storage successful');
        }
    } catch (err) {
        console.error('Error storing advice to cache:', err);
    }
}

export async function callClaude(payload: ClaudePayload): Promise<AdvisoryResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const systemPrompt = `You are a portfolio co-pilot. Use ONLY the provided JSON payload. Do not invent holdings, prices, or macro data.

Goal: propose a small number of practical adjustments that align the portfolio with the macro regime, while respecting data quality and constraints.

Rules:
- If macro_regime.data_quality_label is "low" OR macro_regime.conviction_label is "low", prefer smaller changes or "no action".
- Do not output generic advice. Every action must reference specific holdings and specific macro signals from the payload.
- Avoid frequent trading. Prefer rebalancing.
- Output JSON ONLY with this schema:

{
  "summary": {"headline": "string", "conviction": "low|medium|high", "data_quality": "low|medium|high"},
  "actions": [
    {"action": "rebalance|add|trim|hold", "asset": "string", "from_weight_pct": number|null, "to_weight_pct": number|null, "change_pct": number|null, "why": "string"}
  ],
  "rationale": [
    {"point": "string"}
  ],
  "triggers": [
    {"if": "string", "then": "string"}
  ],
  "no_action_reason": "string|null"
}

Keep actions <= 5. If recommending no action, set actions = [] and fill no_action_reason.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: JSON.stringify(payload, null, 2)
                }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
    }

    const result = await response.json();
    const content = result.content[0].text;

    // Parse JSON response
    // Find the first '{' and the last '}'
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error('Failed to find JSON bounds in Claude response:', content);
        throw new Error('Failed to parse Claude response: No JSON object found');
    }

    const jsonStr = content.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonStr);
    } catch (parseError: any) {
        console.error('JSON Parse Error:', parseError.message);
        console.error('Problematic JSON string:', jsonStr);
        throw new Error(`Failed to parse Claude JSON: ${parseError.message}`);
    }
}
