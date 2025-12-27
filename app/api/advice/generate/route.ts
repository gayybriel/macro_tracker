import { NextResponse } from 'next/server';
import {
    buildClaudePayload,
    computePayloadHash,
    getCachedAdvice,
    callClaude,
    storeCachedAdvice
} from '../../../lib/advisory';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Build payload from Supabase
        const payload = await buildClaudePayload();

        // 2. Compute hash
        const payloadHash = computePayloadHash(payload);

        // 3. Check cache
        const cached = await getCachedAdvice(payload.asof, payloadHash);

        if (cached) {
            console.log('Cache hit! Returning cached result');
            return NextResponse.json({
                ...cached.response,
                cached: true,
                created_at: cached.created_at
            });
        }

        console.log('Cache miss. Calling Claude API...');

        // 4. Call Claude API
        const advice = await callClaude(payload);
        console.log('Claude API response received:', advice);

        // 5. Store in cache
        console.log('Storing in cache...');
        await storeCachedAdvice(payload.asof, payloadHash, payload, advice);
        console.log('Cached successfully');

        // 6. Return fresh result
        return NextResponse.json({
            ...advice,
            cached: false,
            created_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Advisory generation error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to generate advisory',
                details: error.toString()
            },
            { status: 500 }
        );
    }
}
