import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Allow unauthenticated access for public draw results,
        // but enrich response if user is logged in
        const userId = user?.id ?? null;

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 20);
        const weekId = searchParams.get('week_id');

        let query = supabaseAdmin
            .from('weekly_draw_results')
            .select('id, week_id, winner_user_id, winning_ticket_number, total_tickets, prize_amount, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (weekId) {
            query = query.eq('week_id', weekId);
        }

        const { data: draws, error } = await query;

        if (error) {
            console.error('[draw/results] GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch draw results' }, { status: 500 });
        }

        // Look up payout status for current user's wins
        let payoutStatusMap: Record<string, string> = {};
        if (userId) {
            const winningWeeks = (draws ?? [])
                .filter(d => d.winner_user_id === userId)
                .map(d => d.week_id);
            if (winningWeeks.length > 0) {
                const { data: payouts } = await supabaseAdmin
                    .from('pending_payouts')
                    .select('week_id, status')
                    .eq('user_id', userId)
                    .in('week_id', winningWeeks);
                for (const p of payouts ?? []) {
                    payoutStatusMap[p.week_id] = p.status;
                }
            }
        }

        // Anonymize winner info, but tell the current user if they won
        const results = (draws ?? []).map(draw => {
            const isCurrentUserWinner = userId ? draw.winner_user_id === userId : false;

            return {
                id: draw.id,
                weekId: draw.week_id,
                winningTicketNumber: draw.winning_ticket_number,
                totalTickets: draw.total_tickets,
                prizeAmount: draw.prize_amount,
                createdAt: draw.created_at,
                // Anonymize: show first 4 chars of winner UUID only
                winnerHint: draw.winner_user_id
                    ? draw.winner_user_id.substring(0, 4) + '****'
                    : null,
                isYou: isCurrentUserWinner,
                payoutStatus: isCurrentUserWinner ? (payoutStatusMap[draw.week_id] ?? null) : null,
            };
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[draw/results] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
