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

        const { data, error } = await supabaseAdmin.rpc('apply_early_adopter_reward', {
            p_user_id: user.id,
        });

        if (error) {
            console.error('[early-adopter] RPC error:', error);
            return NextResponse.json({ error: 'Failed to apply reward' }, { status: 500 });
        }

        if (data?.error) {
            // already_claimed or not_eligible — both are silent/expected
            return NextResponse.json({ skipped: true, reason: data.error });
        }

        console.log(`[early-adopter] Reward applied for ${user.id}:`, data);
        return NextResponse.json({ success: true, reward: data });

    } catch (err) {
        console.error('[early-adopter] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
