import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const referralCode = user.user_metadata?.referral_code as string | undefined;

        if (!referralCode) {
            return NextResponse.json({ skipped: true, reason: 'no_referral_code' });
        }

        const { data, error } = await supabaseAdmin.rpc('process_referral', {
            p_referee_id:   user.id,
            p_referral_code: referralCode,
        });

        if (error) {
            console.error('[referral/apply] RPC error:', error);
            return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
        }

        if (data?.error) {
            // Non-fatal: already_processed / invalid_code / self_referral
            return NextResponse.json({ skipped: true, reason: data.error });
        }

        console.log(`[referral/apply] Processed referral for ${user.id}:`, data);
        return NextResponse.json({ success: true, reward: data });

    } catch (err) {
        console.error('[referral/apply] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
