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

        const res = await fetch(`${supabaseUrl}/rest/v1/v_portfolio_positions_valued_sgd?select=*`, {
            headers,
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Supabase error: ${res.statusText}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
