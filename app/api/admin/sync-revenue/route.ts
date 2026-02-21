import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentWeekId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Simulate ad network revenue fetch (replace with real API calls later)
function fetchEstimatedAdRevenue(): { totalRevenue: number; source: string } {
    const totalRevenue = Math.floor(Math.random() * 10001) + 5000; // 5000-15000 yen
    return { totalRevenue, source: 'simulated' };
}

export async function POST(request: NextRequest) {
    try {
        // Auth: API key check
        const authHeader = request.headers.get('authorization') ?? '';
        const expectedKey = process.env.ADMIN_API_KEY?.trim();

        // Extract token: strip "Bearer " prefix (case-insensitive), trim whitespace
        const token = authHeader.replace(/^bearer\s+/i, '').trim();

        if (!expectedKey || !token || token !== expectedKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const weekId = getCurrentWeekId();
        const { totalRevenue, source } = fetchEstimatedAdRevenue();

        // 80% goes to user prize pool
        const userShare = Math.floor(totalRevenue * 0.8);

        const { data, error } = await supabaseAdmin.rpc('admin_add_revenue', {
            p_week_id: weekId,
            p_amount: userShare,
        });

        if (error) {
            console.error('admin_add_revenue RPC failed:', error);
            return NextResponse.json({ error: 'Revenue sync failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            weekId,
            grossRevenue: totalRevenue,
            userShare,
            source,
            pool: data,
        });
    } catch (error) {
        console.error('Admin sync-revenue error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
