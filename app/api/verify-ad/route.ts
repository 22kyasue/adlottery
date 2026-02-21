import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { calculateTotalTickets, getDailyViewMeta } from '@/lib/game-logic';
import { getCurrentWeekId, getMidnightJST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Authenticate user from session cookie
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // 2. Bot Detection (Speed Check)
        const { data: logs, error: logsError } = await supabaseAdmin
            .from('ad_watch_logs')
            .select('watched_at')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false })
            .limit(1);

        if (logsError) {
            console.error('Error fetching logs:', logsError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const lastLog = logs?.[0];
        const now = new Date();
        let isSuspicious = false;

        if (lastLog) {
            const lastWatched = new Date(lastLog.watched_at);
            const diffSeconds = (now.getTime() - lastWatched.getTime()) / 1000;
            if (diffSeconds < 30) {
                isSuspicious = true;
            }
        }

        if (isSuspicious) {
            // Silent shadowban
            await supabaseAdmin
                .from('users')
                .update({ is_shadowbanned: true })
                .eq('id', userId);

            await supabaseAdmin.from('ad_watch_logs').insert({
                user_id: userId,
                session_token_hash: 'speed-check-failed',
                metadata: { reason: 'speed_check_failed', time_diff: 'too_fast' },
            });

            return NextResponse.json({ success: true, message: 'Ad verified' });
        }

        // 3. Fetch user data (shadowban + booster status)
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('is_shadowbanned, is_booster_active, booster_expires_at')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'User fetch error' }, { status: 500 });
        }

        if (userData?.is_shadowbanned) {
            await supabaseAdmin.from('ad_watch_logs').insert({
                user_id: userId,
                session_token_hash: 'shadowbanned-attempt',
                metadata: { status: 'shadowbanned' },
            });
            return NextResponse.json({ success: true, message: 'Ad verified' });
        }

        // 4. Determine booster status
        const isBoosterActive = !!(userData?.is_booster_active && userData.booster_expires_at
            && new Date(userData.booster_expires_at) > new Date());

        // 5. Count today's valid watches — 1 ad = 1 view, NO multiplier on input
        const midnightJST = getMidnightJST();
        const weekId = getCurrentWeekId();

        const { count: todayViewCount, error: countError } = await supabaseAdmin
            .from('ad_watch_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('watched_at', midnightJST.toISOString())
            .contains('metadata', { status: 'valid' });

        if (countError) {
            console.error('Error counting daily views:', countError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const prevViews = todayViewCount ?? 0;
        const newViews = prevViews + 1;

        // 6. Diminishing returns on raw view count (booster does NOT affect tiers)
        const ticketsBefore = calculateTotalTickets(prevViews);
        const ticketsAfter = calculateTotalTickets(newViews);
        const baseTicketEarned = ticketsAfter > ticketsBefore;

        let newTicketCount: number | undefined;
        let ticketEarned = false;

        if (baseTicketEarned) {
            // 7. Multiply OUTPUT: 1.5x ticket yield for boosted, 1.0x for normal
            // Fractional accumulation handled atomically in the RPC
            const multiplier = isBoosterActive ? 1.5 : 1.0;

            const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
                'increment_tickets_with_multiplier',
                { p_user_id: userId, p_week_id: weekId, p_multiplier: multiplier }
            );

            if (rpcError) {
                console.error('RPC increment_tickets_with_multiplier failed:', rpcError);
                return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }

            newTicketCount = typeof rpcData === 'number' ? rpcData : undefined;
            ticketEarned = true;
        }

        // 8. Micro-increment prize pool (non-fatal — never blocks ad verification)
        let newPoolTotal: number = 1250000;
        try {
            const poolIncrement = isBoosterActive ? 2 : 1;
            const { data: poolData, error: poolError } = await supabaseAdmin.rpc(
                'increment_prize_pool',
                { p_week_id: weekId, p_amount: poolIncrement }
            );

            console.log('[POOL DEBUG] RPC result:', JSON.stringify({ poolData, poolError, weekId, poolIncrement }));

            // Parse flexibly — RPC may return number, string, or wrapped value
            const parsed = Number(poolData);
            if (!isNaN(parsed) && parsed > 0) {
                newPoolTotal = parsed;
            } else {
                // RPC failed or returned unexpected data — manual fallback
                console.error('[POOL DEBUG] RPC unusable, trying manual upsert. poolData:', poolData, 'poolError:', poolError);

                // Attempt manual upsert: insert row then increment
                const { data: existingRow } = await supabaseAdmin
                    .from('weekly_prize_pool')
                    .select('base_amount, ad_revenue_added')
                    .eq('week_id', weekId)
                    .maybeSingle();

                if (existingRow) {
                    // Row exists — update it
                    const newRevenue = (existingRow.ad_revenue_added ?? 0) + poolIncrement;
                    await supabaseAdmin
                        .from('weekly_prize_pool')
                        .update({ ad_revenue_added: newRevenue, updated_at: new Date().toISOString() })
                        .eq('week_id', weekId);
                    newPoolTotal = (existingRow.base_amount ?? 1250000) + newRevenue;
                } else {
                    // No row — insert one
                    await supabaseAdmin
                        .from('weekly_prize_pool')
                        .insert({ week_id: weekId, ad_revenue_added: poolIncrement });
                    newPoolTotal = 1250000 + poolIncrement;
                }
            }
        } catch (poolErr) {
            console.error('[POOL DEBUG] Prize pool increment failed entirely:', poolErr);
        }

        // 9. Log this valid watch (tag with boosted flag)
        await supabaseAdmin.from('ad_watch_logs').insert({
            user_id: userId,
            session_token_hash: user.email ?? 'authenticated',
            metadata: { status: 'valid', week_id: weekId, boosted: isBoosterActive },
        });

        // 9. Return response — tier info based on raw views (not boosted)
        const viewMeta = getDailyViewMeta(newViews);

        return NextResponse.json({
            success: true,
            ticketEarned,
            newTicketCount,
            newPoolTotal,
            dailyViews: newViews,
            currentTier: viewMeta.currentTier,
            adsPerTicket: viewMeta.adsPerTicket,
            viewsUntilNextTicket: viewMeta.viewsUntilNextTicket,
            isBoosterActive,
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
