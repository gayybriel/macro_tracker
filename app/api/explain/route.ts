import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
        // Query: select *, order by category asc, name asc
        const url = `${supabaseUrl}/rest/v1/v_indicator_features_explain?select=*&order=category.asc,name.asc`;

        const res = await fetch(url, { headers, cache: 'no-store' });

        if (!res.ok) {
            throw new Error(`Failed to fetch explain data: ${res.statusText}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Explain API Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
