import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const bet = Math.floor(body?.bet);

        if (!Number.isFinite(bet) || bet <= 0) {
            return NextResponse.json({ error: 'Invalid bet. Must be a positive integer.' }, { status: 400 });
        }
        if (bet > 500) {
            return NextResponse.json({ error: 'Maximum bet is 500 chips.' }, { status: 400 });
        }

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'blackjack_deal',
            { p_user_id: user.id, p_bet: bet }
        );

        if (rpcError) {
            console.error('blackjack_deal RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                insufficient_chips: { message: `Not enough Vibe Chips. You have ${result.have}, need ${result.need}.`, status: 400 },
                invalid_bet: { message: 'Invalid bet amount.', status: 400 },
                bet_too_high: { message: `Maximum bet is ${result.max} chips.`, status: 400 },
                user_not_found: { message: 'User not found.', status: 404 },
                active_session_exists: { message: 'You already have an active blackjack game.', status: 409 },
            };
            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json({ error: mapped.message }, { status: mapped.status });
        }

        return NextResponse.json({
            success: true,
            playerHand: result.playerHand,
            dealerHand: result.dealerHand,
            dealerVisible: result.dealerVisible,
            playerValue: result.playerValue,
            dealerValue: result.dealerValue,
            status: result.status,
            result: result.result,
            payout: result.payout,
            newChips: result.newChips,
            sessionId: result.sessionId,
        });

    } catch (error) {
        console.error('Casino blackjack deal API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
