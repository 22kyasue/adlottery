import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ACK = () => new Response("1", { headers: { 'Content-Type': 'text/plain' } });
const FORBIDDEN = () => new Response("Forbidden", { status: 403 });

function extractParams(params: URLSearchParams, body?: Record<string, string>): Record<string, string> {
    const merged: Record<string, string> = {};
    params.forEach((value, key) => { merged[key] = value; });
    if (body) {
        Object.entries(body).forEach(([key, value]) => { merged[key] = String(value); });
    }
    return merged;
}

function normalizePostback(p: Record<string, string>) {
    return {
        userId: p.sub_id1 || p.sub_id || p.userId || p.user_id || '',
        offerId: p.offer_id || p.appKey || p.campaign_id || 'unknown',
        transactionId: p.id || p.transactionId || p.transaction_id || '',
        rewardAmount: parseInt(p.currency || p.rewardAmount || p.reward || '0', 10),
        rewardType: p.reward_type || 'tickets',
    };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handlePostback(params: URLSearchParams, body?: Record<string, string>) {
    const secret = params.get('secret');
    if (secret !== process.env.OFFERWALL_SECRET_KEY) {
        return FORBIDDEN();
    }

    const merged = extractParams(params, body);
    const { userId, offerId, transactionId, rewardAmount, rewardType } = normalizePostback(merged);

    // Validate userId is a UUID — acknowledge even if invalid (prevent provider retries)
    if (!userId || !UUID_RE.test(userId)) {
        console.warn('[offerwall] Invalid userId:', userId);
        return ACK();
    }

    if (!transactionId) {
        console.warn('[offerwall] Missing transactionId');
        return ACK();
    }

    // Verify user exists
    const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

    if (!userRow) {
        console.warn('[offerwall] User not found:', userId);
        return ACK();
    }

    // Call the atomic award RPC
    const { error } = await supabaseAdmin.rpc('award_offer_completion', {
        p_user_id: userId,
        p_offer_id: offerId,
        p_provider: merged.provider || 'generic',
        p_provider_transaction_id: transactionId,
        p_reward_type: rewardType,
        p_reward_amount: rewardAmount || 0,
        p_raw_params: merged,
    });

    if (error) {
        console.error('[offerwall] RPC error:', error);
        return new Response("error", { status: 500 });
    }

    return ACK();
}

// Tapjoy-style GET postback
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    return handlePostback(searchParams);
}

// ironSource-style POST postback
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    let body: Record<string, string> | undefined;
    try {
        body = await request.json();
    } catch {
        // Body may be empty or form-encoded — fall through to query params only
    }
    return handlePostback(searchParams, body);
}
