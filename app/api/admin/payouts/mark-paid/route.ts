import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminKey } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        if (!verifyAdminKey(request.headers.get('authorization'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);

        if (!body?.payoutId) {
            return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin.rpc('mark_payout_paid', {
            p_payout_id: body.payoutId,
            p_payment_method: body.paymentMethod ?? null,
            p_transaction_id: body.transactionId ?? null,
        });

        if (error) {
            console.error('[mark-paid] RPC error:', error);
            return NextResponse.json({ error: 'Failed to mark payout as paid', details: error.message }, { status: 500 });
        }

        if (data?.error) {
            return NextResponse.json({ error: data.error }, { status: 409 });
        }

        return NextResponse.json({ success: true, result: data });
    } catch (error) {
        console.error('[mark-paid] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
