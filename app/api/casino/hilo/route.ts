import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse and validate body
        const body = await request.json();
        const bet = Math.floor(body?.bet);
        const guess = body?.guess;

        if (!Number.isFinite(bet) || bet <= 0) {
            return NextResponse.json(
                { error: 'Invalid bet. Must be a positive integer.' },
                { status: 400 }
            );
        }

        if (bet > 500) {
            return NextResponse.json(
                { error: 'Maximum bet is 500 chips.' },
                { status: 400 }
            );
        }

        if (guess !== 'higher' && guess !== 'lower') {
            return NextResponse.json(
                { error: 'Guess must be "higher" or "lower".' },
                { status: 400 }
            );
        }

        // 3. Call the atomic RPC
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'play_hilo',
            { p_user_id: user.id, p_bet: bet, p_guess: guess }
        );

        if (rpcError) {
            console.error('play_hilo RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        // 4. Interpret the RPC's JSONB return
        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                insufficient_chips: {
                    message: `Not enough Vibe Chips. You have ${result.have}, need ${result.need}.`,
                    status: 400,
                },
                invalid_guess: { message: 'Invalid guess.', status: 400 },
                invalid_bet: { message: 'Invalid bet amount.', status: 400 },
                bet_too_high: { message: `Maximum bet is ${result.max} chips.`, status: 400 },
                user_not_found: { message: 'User not found.', status: 404 },
            };

            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json({ error: mapped.message }, { status: mapped.status });
        }

        // 5. Success
        return NextResponse.json({
            success: true,
            outcome: result.outcome,
            card: result.card,
            drawnCard: result.drawn_card,
            bet: result.bet,
            payout: result.payout,
            net: result.net,
            multiplier: result.multiplier,
            newChips: result.new_chips,
        });

    } catch (error) {
        console.error('Casino hi-lo API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
