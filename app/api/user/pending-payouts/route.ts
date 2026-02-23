import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('pending_payouts')
            .select('id, week_id, amount, status, expires_at, created_at')
            .eq('user_id', user.id)
            .in('status', ['pending', 'ready'])
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[pending-payouts] GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch pending payouts' }, { status: 500 });
        }

        return NextResponse.json({ payouts: data ?? [] });
    } catch (error) {
        console.error('[pending-payouts] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
