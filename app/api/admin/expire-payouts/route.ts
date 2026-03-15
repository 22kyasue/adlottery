import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminOrCron } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET handler for Vercel Cron (cron jobs send GET requests)
export async function GET(request: NextRequest) {
    return expirePayouts(request);
}

export async function POST(request: NextRequest) {
    return expirePayouts(request);
}

async function expirePayouts(request: NextRequest) {
    try {
        if (!verifyAdminOrCron(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin.rpc('expire_overdue_payouts');

        if (error) {
            console.error('[expire-payouts] RPC error:', error);
            return NextResponse.json({ error: 'Failed to expire payouts', details: error.message }, { status: 500 });
        }

        console.log(`[expire-payouts] Expired ${data} payouts`);

        return NextResponse.json({
            success: true,
            expiredCount: data,
        });
    } catch (error) {
        console.error('[expire-payouts] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
