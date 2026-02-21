import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { offerId } = await request.json();

        if (!offerId || typeof offerId !== 'string') {
            return NextResponse.json({ error: 'Missing offerId' }, { status: 400 });
        }

        // Upsert into offer_clicks (idempotent on user_id, offer_id)
        const { error } = await supabaseAdmin
            .from('offer_clicks')
            .upsert(
                { user_id: user.id, offer_id: offerId },
                { onConflict: 'user_id,offer_id' }
            );

        if (error) {
            console.error('[offer-click] Insert error:', error);
            return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[offer-click] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
