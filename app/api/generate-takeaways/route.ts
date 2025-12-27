import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DBIndicatorFeature } from '../../types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
            { error: 'Missing Supabase credentials' },
            { status: 500 }
        );
    }

    if (!anthropicKey) {
        return NextResponse.json(
            { error: 'Missing Anthropic API Key' },
            { status: 500 }
        );
    }

    const anthropic = new Anthropic({
        apiKey: anthropicKey,
    });

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
    };

    try {
        // 1. Fetch all indicator features
        console.log('Fetching indicator features for AI analysis...');
        const featuresRes = await fetch(`${supabaseUrl}/rest/v1/v_indicator_features?order=category.asc,code.asc`, { headers, cache: 'no-store' });

        if (!featuresRes.ok) {
            throw new Error(`Failed to fetch indicators: ${featuresRes.statusText}`);
        }

        const features: DBIndicatorFeature[] = await featuresRes.json();

        // 2. Format data: simple map to limit sig figs
        const formattedFeatures = features.map(f => {
            // Create a clean object with relevant fields only to save tokens
            return {
                code: f.code,
                name: f.name,
                category: f.category,
                latest: f.latest_value !== null ? Number(f.latest_value.toPrecision(4)) : null,
                delta_1m: f.delta_1m !== null ? Number(f.delta_1m.toPrecision(4)) : null,
                zscore_3y: f.zscore_3y !== null ? Number(f.zscore_3y.toPrecision(4)) : null,
                percentile: f.pctile_10y !== null ? Number(f.pctile_10y.toPrecision(4)) : null,
            };
        });

        // 3. Prompt Claude
        console.log('Calling Claude...');
        const msg = await anthropic.messages.create({
            model: "claude-haiku-4-5", // Fallback to "claude-3-sonnet-20240229" if this alias isn't available
            max_tokens: 500,
            temperature: 0.2, // Low temp for more analytical/consistent results
            system: "You are a senior macro strategist. Analyze the provided economic data. Identify the most significant regime shifts, risks, or opportunities. Output EXACTLY 3-5 concise bullet points (plain text, no markdown bullets needed, just newlines or separated). Do not include introductory text. You need to explain it in terms that a retail investor with basic investment knowledge can understand.",
            messages: [
                {
                    "role": "user",
                    "content": `Analyze this macro dashboard data (deltas are 1-month changes, zscores are 3-year). \n\n${JSON.stringify(formattedFeatures, null, 2)}`
                }
            ]
        });

        // 4. Extract text
        const contentBlock = msg.content[0];
        if (contentBlock.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }

        const rawText = contentBlock.text;
        // Split by newlines and clean up
        const bullets = rawText
            .split('\n')
            .map((line: string) => line.replace(/^[\s\-\*•]+/, '').trim())
            .filter((line: string) => line.length > 0)
            .slice(0, 5); // Ensure max 5

        console.log('Generated bullets:', bullets);

        return NextResponse.json({ bullets });

    } catch (error: any) {
        console.error('AI Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
