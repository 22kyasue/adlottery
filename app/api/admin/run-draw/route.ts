import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentWeekId } from '@/lib/utils';
import { verifyAdminKey } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        if (!verifyAdminKey(request.headers.get('authorization'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Allow optional week_id override, default to current week
        const body = await request.json().catch(() => ({}));
        const weekId = body.weekId || getCurrentWeekId();

        // Execute the draw via RPC
        const { data, error } = await supabaseAdmin.rpc('select_weekly_winner', {
            p_week_id: weekId,
        });

        if (error) {
            console.error('[run-draw] RPC error:', error);
            return NextResponse.json({ error: 'Draw execution failed', details: error.message }, { status: 500 });
        }

        // RPC returns JSONB — check for error field
        if (data?.error) {
            return NextResponse.json({ error: data.error, week_id: weekId }, { status: 409 });
        }

        console.log(`[run-draw] Draw completed for ${weekId}:`, data);

        return NextResponse.json({
            success: true,
            draw: data,
        });
    } catch (error) {
        console.error('[run-draw] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
