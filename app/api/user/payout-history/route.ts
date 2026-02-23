import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse optional limit/offset params
        const url = new URL(request.url);
        const limitParam = parseInt(url.searchParams.get('limit') ?? '20', 10);
        const limit = Math.min(Math.max(1, limitParam || 20), 50);
        const offsetParam = parseInt(url.searchParams.get('offset') ?? '0', 10);
        const offset = Math.max(0, offsetParam || 0);

        const { data, error } = await supabaseAdmin
            .from('pending_payouts')
            .select('id, week_id, amount, status, expires_at, created_at, paid_at, payment_method, transaction_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[payout-history] GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch payout history' }, { status: 500 });
        }

        return NextResponse.json({ payouts: data ?? [] });
    } catch (error) {
        console.error('[payout-history] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
