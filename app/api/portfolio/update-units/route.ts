import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    try {
        const { code, new_quantity } = await req.json();

        if (!code || new_quantity === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        // 1. Resolve Asset ID
        const assetRes = await fetch(`${supabaseUrl}/rest/v1/assets?code=eq.${code}&select=asset_id`, { headers });
        const assets = await assetRes.json();
        const assetId = assets[0]?.asset_id;

        if (!assetId) {
            return NextResponse.json({ error: `Asset not found: ${code}` }, { status: 404 });
        }

        // 2. Update Position (no account dimension anymore)
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/positions?asset_id=eq.${assetId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                quantity: new_quantity,
                updated_at: new Date().toISOString()
            })
        });

        if (!updateRes.ok) {
            const err = await updateRes.text();
            throw new Error(`Failed to update position: ${err}`);
        }

        return NextResponse.json({ success: true, message: 'Units updated' });

    } catch (error: any) {
        console.error('Update Units Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
