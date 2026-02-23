import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminKey } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        if (!verifyAdminKey(request.headers.get('authorization'))) {
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
