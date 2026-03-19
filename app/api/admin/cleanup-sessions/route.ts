import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminOrCron } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET handler for Vercel Cron
export async function GET(request: NextRequest) {
    return cleanupSessions(request);
}

export async function POST(request: NextRequest) {
    return cleanupSessions(request);
}

async function cleanupSessions(request: NextRequest) {
    try {
        if (!verifyAdminOrCron(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin.rpc('cleanup_stale_casino_sessions');

        if (error) {
            console.error('[cleanup-sessions] RPC error:', error);
            return NextResponse.json({ error: 'Failed to cleanup sessions', details: error.message }, { status: 500 });
        }

        console.log(`[cleanup-sessions] Cleaned up ${data} stale sessions`);

        return NextResponse.json({
            success: true,
            cleanedCount: data,
        });
    } catch (error) {
        console.error('[cleanup-sessions] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
