import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow enough time for LLM generation

export async function POST(req: Request) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    if (!supabaseUrl || !supabaseKey || !deepseekKey) {
        return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    try {
        const { code } = await req.json();
        if (!code) {
            return NextResponse.json({ error: 'Missing indicator code' }, { status: 400 });
        }

        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        // 1. Fetch Features FIRST (to determine data version)
        const featureRes = await fetch(`${supabaseUrl}/rest/v1/v_indicator_features?code=eq.${code}&limit=1`, { headers });
        const features = (await featureRes.json())[0];

        if (!features) throw new Error(`Indicator feature not found: ${code}`);

        const currentLatestDate = features.latest_date;

        // 2. Generate Fingerprint (to detect revisions even if date is same)
        const fingerprintData = {
            val: features.latest_value,
            d1m: features.delta_1m,
            z3y: features.zscore_3y
        };
        const currentFingerprint = Buffer.from(JSON.stringify(fingerprintData)).toString('base64');

        // 3. Smart Cache Check: Do we have a DONE insight for this data version?
        // Note: data_latest_date ensures we only reuse insight if data is same version
        const cacheCheckReq = await fetch(`${supabaseUrl}/rest/v1/indicator_insights_daily?code=eq.${code}&data_latest_date=eq.${currentLatestDate}&status=eq.done&limit=1`, {
            headers,
            cache: 'no-store'
        });

        if (cacheCheckReq.ok) {
            const cachedRows = await cacheCheckReq.json();
            if (cachedRows.length > 0) {
                // CACHE HIT! Return immediately
                return NextResponse.json(cachedRows[0]);
            }
        }

        // --- CACHE MISS: Proceed to Generate ---

        // 4. Daily Lock Mechanism (using asof_date=today to prevent race conditions today)
        const sgTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" });
        const asof_date = new Date(sgTime).toISOString().split('T')[0];

        // Try to insert lock (pending)
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/indicator_insights_daily`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'resolution=ignore-duplicates, return=representation'
            },
            body: JSON.stringify({
                code,
                asof_date,
                status: 'pending',
                data_latest_date: currentLatestDate, // Record version for future cache hits
                data_fingerprint: currentFingerprint
            })
        });

        if (!insertRes.ok) throw new Error(`Failed to insert lock: ${insertRes.statusText}`);

        const insertedRows = await insertRes.json();

        // If empty, someone else holds the lock for TODAY.
        if (insertedRows.length === 0) {
            // Fetch and return whatever state is there (likely pending)
            const refetch = await fetch(`${supabaseUrl}/rest/v1/indicator_insights_daily?code=eq.${code}&asof_date=eq.${asof_date}&select=*`, {
                headers,
                cache: 'no-store'
            });
            const rows = await refetch.json();
            return NextResponse.json(rows[0] || { status: 'pending' });
        }

        // WE OWN THE LOCK. PROCEED TO GENERATE.

        // 5. Fetch History
        const freq = features.frequency?.toLowerCase() || 'daily';
        let limit = 60;
        if (freq.includes('week')) limit = 52;
        if (freq.includes('month')) limit = 24;

        const historyRes = await fetch(`${supabaseUrl}/rest/v1/indicator_values?code=eq.${code}&order=obs_date.desc&limit=${limit}&select=obs_date,raw_value`, { headers });
        const history = await historyRes.json();

        // 6. Build Payload
        const llmPayload = {
            metadata: {
                name: features.name,
                category: features.category,
                unit: features.display_unit,
                frequency: features.frequency,
                source: features.source
            },
            stats: {
                latest_value: features.latest_value,
                latest_date: features.latest_date,
                delta_1m: features.delta_1m,
                zscore_3y: features.zscore_3y,
                delta_3m: features.delta_3m ?? null,
                percentile_10y: features.pctile_10y ?? features.percentile_10y ?? null
            },
            recent_history: history.reverse(),
            current_date: asof_date
        };

        // 7. Call DeepSeek
        // Note: Using the complex prompt requested by user
        const systemPrompt = "You are a macro dashboard analyst. Be concise. Give insights useful to a retail investor based on the indicator data.";
        const userPrompt = `Analyze this indicator data:\n${JSON.stringify(llmPayload)}\n\nInstructions:\nOUTPUT REQUIREMENTS:
Return JSON ONLY with this exact schema:
{
  "headline": "string (<= 80 chars)",
  "signal_label": "bullish|neutral|bearish",
  "confidence": number (0.0 to 1.0),
  "confidence_reason": "string (<= 140 chars)",

  "what_it_measures": "string (<= 200 chars)",
  "directionality": {
    "higher_is": "better|worse|depends",
    "notes": "string (<= 160 chars)"
  },

  "now": {
    "latest_date": "YYYY-MM-DD",
    "latest_value": number,
    "context": {
      "pctile_10y": number|null,
      "zscore_3y": number|null
    }
  },

  "momentum": {
    "delta_1w": number|null,
    "delta_1m": number|null,
    "delta_3m": number|null,
    "momentum_label": "improving|deteriorating|mixed|flat"
  },

  "watch_levels": {
    "bullish_trigger": {"level": number|null, "direction": "below|above|null", "why": "string (<= 120 chars)"},
    "bearish_trigger": {"level": number|null, "direction": "below|above|null", "why": "string (<= 120 chars)"},
    "notes": "string (<= 160 chars)"
  },

  "recent_pattern": "string (<= 220 chars)",

  "narrative_bullets": [
    {"title": "What it is", "text": "string (<= 240 chars)"},
    {"title": "Level vs history", "text": "string (<= 240 chars)"},
    {"title": "Momentum", "text": "string (<= 240 chars)"},
    {"title": "What to watch", "text": "string (<= 240 chars)"},
    {"title": "Recent pattern", "text": "string (<= 240 chars)"}
  ],

  "implications": {
    "asset_impact": [
      {"asset": "equities|credit|rates|usd|commodities", "impact": "supportive|headwind|neutral", "why": "string (<= 120 chars)"}
    ],
    "positioning_tilt": {
      "equity_beta": "increase|reduce|neutral",
      "duration": "increase|reduce|neutral",
      "credit_risk": "increase|reduce|neutral",
      "cash_buffer": "increase|reduce|neutral"
    }
  },

  "data_quality": {
    "missing_fields": ["string", "..."],
    "notes": "string (<= 160 chars)"
  }
}`;

        const llmRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!llmRes.ok) {
            const errText = await llmRes.text();
            throw new Error(`DeepSeek API error: ${llmRes.status} ${errText}`);
        }

        const llmJson = await llmRes.json();
        const content = llmJson.choices[0].message.content;
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            console.error('Failed to parse LLM JSON', content);
            throw new Error('Invalid LLM response format');
        }

        // 8. Update DB with Result (Schema V2 + Caching Columns)
        const updatePayload = {
            status: 'done',
            insight_json: result,
            headline: result.headline,
            signal_label: result.signal_label ? result.signal_label.toLowerCase() : null,
            confidence: result.confidence,
            confidence_reason: result.confidence_reason,
            model: 'deepseek-chat',
            updated_at: new Date().toISOString(),
            data_latest_date: currentLatestDate, // Store version
            data_fingerprint: currentFingerprint
        };

        const updateRes = await fetch(`${supabaseUrl}/rest/v1/indicator_insights_daily?code=eq.${code}&asof_date=eq.${asof_date}`, {
            method: 'PATCH',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updatePayload)
        });

        if (!updateRes.ok) {
            const err = await updateRes.text();
            throw new Error(`Failed to save insights: ${err}`);
        }

        const finalRow = await updateRes.json();
        return NextResponse.json(finalRow[0]);

    } catch (error: any) {
        console.error('Insight Gen Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
