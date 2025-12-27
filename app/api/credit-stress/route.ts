import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    try {
        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };

        // 1. Fetch History (ordered, limited to ~5 years approx)
        // 5 years * 252 trading days ~= 1260 rows. Safe.
        const historyRes = await fetch(`${supabaseUrl}/rest/v1/v_credit_risk_gap?order=obs_date.desc&limit=1300`, {
            headers,
            cache: 'no-store'
        });

        if (!historyRes.ok) throw new Error(`History fetch failed: ${historyRes.statusText}`);

        const history = await historyRes.json();

        if (!history || history.length === 0) {
            return NextResponse.json({ stats: null, history: [] });
        }

        // 2. Compute Stats (Latest vs 30 days ago)
        const latest = history[0];
        const latestDate = new Date(latest.obs_date);

        // Find ~30 days ago
        // Since it's sorted desc, we iterate until date <= target
        const targetDate = new Date(latestDate);
        targetDate.setDate(targetDate.getDate() - 30);

        const prev = history.find((d: any) => new Date(d.obs_date) <= targetDate) || history[history.length - 1];

        const stats = {
            as_of: latest.obs_date,
            gap_bps: latest.gap_bps,
            hy_oas_pct: latest.hy_oas_pct,
            ig_oas_pct: latest.ig_oas_pct,
            change_30d_bps: latest.gap_bps - prev.gap_bps
        };

        return NextResponse.json({
            stats,
            history: history.reverse() // Return chronological for chart
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
