import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeCompare } from '@/lib/auth-helpers';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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
    if (!safeCompare(secret, process.env.OFFERWALL_SECRET_KEY)) {
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

    // Apply configurable multiplier (defaults to 1.0)
    const multiplier = parseFloat(process.env.OFFERWALL_MULTIPLIER || '1.0') || 1.0;
    const scaledReward = Math.floor((rewardAmount || 0) * multiplier);

    // Call the atomic award RPC
    const { error } = await supabaseAdmin.rpc('award_offer_completion', {
        p_user_id: userId,
        p_offer_id: offerId,
        p_provider: merged.provider || 'generic',
        p_provider_transaction_id: transactionId,
        p_reward_type: rewardType,
        p_reward_amount: scaledReward,
        p_raw_params: merged,
    });

    if (error) {
        console.error('[offerwall] RPC error:', error);

        // Store failed completion for retry (best-effort, don't block response)
        try {
            await supabaseAdmin.from('webhook_failures').insert({
                provider: merged.provider || 'generic',
                transaction_id: transactionId,
                user_id: userId,
                payload: merged,
                error_message: error.message,
            });
        } catch (storeErr) {
            console.error('[offerwall] Failed to store retry record:', storeErr);
        }

        // ACK to prevent provider retries — we handle retries internally
        return ACK();
    }

    return ACK();
}

// Tapjoy-style GET postback
export async function GET(request: Request) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = checkRateLimit(ip, RATE_LIMITS.webhook);
    if (!rl.allowed) return new Response("Rate limited", { status: 429 });
    const { searchParams } = new URL(request.url);
    return handlePostback(searchParams);
}

// ironSource-style POST postback
export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = checkRateLimit(ip, RATE_LIMITS.webhook);
    if (!rl.allowed) return new Response("Rate limited", { status: 429 });
    const { searchParams } = new URL(request.url);
    let body: Record<string, string> | undefined;
    try {
        body = await request.json();
    } catch {
        // Body may be empty or form-encoded — fall through to query params only
    }
    return handlePostback(searchParams, body);
}
