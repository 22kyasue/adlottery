import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentWeekId } from '@/lib/utils';
import { verifyAdminOrCron } from '@/lib/auth-helpers';
import { sendWinnerNotification } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET handler for Vercel Cron (cron jobs send GET requests)
export async function GET(request: NextRequest) {
    return runDraw(request);
}

export async function POST(request: NextRequest) {
    return runDraw(request);
}

async function runDraw(request: NextRequest) {
    try {
        if (!verifyAdminOrCron(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Allow optional week_id override (POST body), default to current week
        const body = request.method === 'POST'
            ? await request.json().catch(() => ({}))
            : {};
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

        // Send winner notification email (fire-and-forget)
        if (data?.winner_user_id) {
            try {
                const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.winner_user_id);
                if (userError) {
                    console.error('[run-draw] Failed to fetch winner user:', userError);
                } else if (userData?.user?.email) {
                    const emailSent = await sendWinnerNotification(userData.user.email, weekId, data.prize_amount);
                    console.log(`[run-draw] Winner email ${emailSent ? 'sent' : 'failed'} to ${userData.user.email}`);
                }
            } catch (emailErr) {
                console.error('[run-draw] Winner email error (non-fatal):', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            draw: data,
        });
    } catch (error) {
        console.error('[run-draw] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
