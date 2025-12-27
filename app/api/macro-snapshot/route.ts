import { NextResponse } from 'next/server';
import { Indicator, MacroSnapshot, RegimeSnapshot, DBIndicatorFeature, TrendPoint, RegimeTakeaways } from '../../types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
            { error: 'Missing Supabase credentials' },
            { status: 500 }
        );
    }

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
    };

    try {
        console.log('Fetching macro snapshot...');

        // 1. Fetch Regime Snapshot
        const regimeRes = await fetch(`${supabaseUrl}/rest/v1/v_regime_snapshot?limit=1`, { headers, cache: 'no-store' });
        if (!regimeRes.ok) {
            throw new Error(`Failed to fetch regime: ${regimeRes.statusText}`);
        }
        const regimeData: RegimeSnapshot[] = await regimeRes.json();
        const regime = regimeData.length > 0 ? regimeData[0] : null;

        // 2. Fetch Regime Takeaways
        let takeaways: RegimeTakeaways | null = null;
        try {
            const takeawaysRes = await fetch(`${supabaseUrl}/rest/v1/v_regime_takeaways?limit=1`, { headers, cache: 'no-store' });
            if (takeawaysRes.ok) {
                const takeawaysData: RegimeTakeaways[] = await takeawaysRes.json();
                takeaways = takeawaysData.length > 0 ? takeawaysData[0] : null;
            } else {
                console.warn('Failed to fetch takeaways, skipping:', takeawaysRes.status);
            }
        } catch (e) {
            console.warn('Error fetching takeaways:', e);
        }

        // 3. Fetch Indicator Features
        const featuresRes = await fetch(`${supabaseUrl}/rest/v1/v_indicator_features?order=category.asc,code.asc`, { headers, cache: 'no-store' });
        if (!featuresRes.ok) {
            throw new Error(`Failed to fetch indicators: ${featuresRes.statusText}`);
        }
        const features: DBIndicatorFeature[] = await featuresRes.json();

        // 4. Fetch Trend Data (Parallel)
        // Fetching last 40 points to ensure good sparkline density
        const indicatorsWithTrend = await Promise.all(features.map(async (feat) => {
            const limit = 40;
            // Note: using obs_date (DATE) now, not observation_date (TEXT)
            const url = `${supabaseUrl}/rest/v1/indicator_values?select=obs_date,raw_value&code=eq.${feat.code}&obs_date=not.is.null&order=obs_date.desc&limit=${limit}`;

            const trendRes = await fetch(url, { headers, cache: 'no-store' });
            let trend: TrendPoint[] = [];

            if (trendRes.ok) {
                const rawTrend = await trendRes.json();
                // Map and reverse (so it's ascending by date for the graph)
                // Also ensure value handles nulls if any exist in DB (though schema says raw_value nullable)
                trend = rawTrend.map((t: any) => ({
                    date: t.obs_date,
                    value: t.raw_value
                })).reverse();
            } else {
                console.error(`Failed to fetch trend for ${feat.code}`);
            }

            return {
                ...feat,
                trend
            } as Indicator;
        }));

        // Determine master "As Of" date
        const asOf = regime?.asof_date || new Date().toISOString().split('T')[0];

        const response: MacroSnapshot = {
            asOf,
            regime,
            takeaways,
            indicators: indicatorsWithTrend
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
